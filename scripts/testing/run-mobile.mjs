import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'

import { terminateProcessTree } from './process-tree.mjs'

const platform = process.argv[2]
if (!['android', 'ios'].includes(platform)) throw new Error('Use pnpm nx run mobile:e2e:android or mobile:e2e:ios')
if (platform === 'ios' && process.platform !== 'darwin') throw new Error('iOS device tests require macOS and Xcode.')
if (!['darwin', 'linux'].includes(process.platform))
  throw new Error('The local device runner supports macOS and Linux.')

const root = resolve(import.meta.dirname, '../..')
const tools = JSON.parse(await readFile(resolve(import.meta.dirname, 'mobile-tools.json'), 'utf8'))
const profile = JSON.parse(await readFile(resolve(root, 'apps/mobile/eas.json'), 'utf8')).build.e2e
const runId = randomBytes(8).toString('hex')
const report = resolve(root, `dist/test-results/mobile/e2e/${platform}/${runId}`)
await mkdir(report, { recursive: true })
const log = createWriteStream(resolve(report, 'runner.log'))
const children = new Set()
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    /^(PATH|HOME|USER|TMPDIR|TMP|TEMP|LANG|LC_.*|JAVA_HOME|ANDROID_HOME|ANDROID_SDK_ROOT|DEVELOPER_DIR|CI)$/.test(key)
  )
)
Object.assign(env, {
  ...profile.env,
  CI: '1',
  NODE_ENV: 'production',
  EXPO_NO_DOTENV: '1',
  NX_LOAD_DOT_ENV_FILES: 'false',
  SENTRY_DISABLE_AUTO_UPLOAD: 'true',
  MAESTRO_CLI_NO_ANALYTICS: '1',
  RAY_MOBILE_E2E: 'true',
  EXPO_PUBLIC_DEFAULT_LOCALE: 'en',
  EXPO_PUBLIC_AUTH_PASSWORD: 'true',
  EXPO_PUBLIC_AUTH_ANONYMOUS: 'false',
  EXPO_PUBLIC_ANALYTICS_PROVIDER: 'posthog',
  EXPO_PUBLIC_MONITORING_PROVIDER: 'sentry'
})
let interrupted = false
let cleaning = false
let device
let emulator
let deviceOwned = false
let workspace
let passed = false
let cleaned = true
let commandIndex = 0

function interrupt() {
  interrupted = true
  process.exitCode = 1
  if (!cleaning)
    for (const child of children) {
      try {
        terminateProcessTree(child.pid, 'SIGTERM')
      } catch {
        /* exited */
      }
    }
}
process.on('SIGINT', interrupt)
process.on('SIGTERM', interrupt)

function command(
  executable,
  args,
  { cwd = root, timeout = 120_000, input, background = false, captureAll = false } = {}
) {
  if (interrupted && !cleaning) throw new Error('Mobile test interrupted')
  log.write(`\n${executable} ${args.join(' ')}\n`)
  const stream = createWriteStream(resolve(report, `${++commandIndex}-${executable.split('/').at(-1)}.log`))
  const child = spawn(executable, args, { cwd, env, detached: true, stdio: ['pipe', 'pipe', 'pipe'] })
  children.add(child)
  let output = ''
  const capture = chunk => {
    output = captureAll ? output + chunk : (output + chunk).slice(-64_000)
    stream.write(chunk)
  }
  child.stdout.on('data', capture)
  child.stderr.on('data', capture)
  child.stdin.end(input)
  const completion = new Promise((resolveResult, reject) => {
    const timer = setTimeout(() => {
      try {
        terminateProcessTree(child.pid, 'SIGKILL')
      } catch {
        /* exited */
      }
    }, timeout)
    child.once('error', reject)
    child.once('close', (code, signal) => {
      clearTimeout(timer)
      children.delete(child)
      stream.end(() => {
        if (code === 0) resolveResult(output.trim())
        else reject(new Error(`${executable} failed (${signal ?? code}): ${output.slice(-4000)}`))
      })
    })
  })
  // Keep background failures observable without unhandled rejections.
  if (background) {
    completion.catch(() => {})
    return { child, completion }
  }
  return completion
}

const requests = []
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname
  requests.push({ method: request.method, path })
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Cache-Control', 'no-store')
  // An external signed-out fixture. The app's auth client and navigation are real.
  if (
    request.method === 'GET' &&
    [
      '/api/auth/get-session',
      '/api/auth/organization/get-full-organization',
      '/api/auth/organization/get-active-member'
    ].includes(path)
  )
    return response.end('null')
  response.statusCode = 404
  response.end(JSON.stringify({ message: 'No fixture for this request' }))
})

const sdk = env.ANDROID_HOME ?? env.ANDROID_SDK_ROOT ?? resolve(env.HOME, 'Library/Android/sdk')
const adb = resolve(sdk, 'platform-tools/adb')
const avdmanager = resolve(sdk, 'cmdline-tools/latest/bin/avdmanager')
const maestro =
  process.env.RAY_MAESTRO_BIN ??
  resolve(root, `.cache/testing-tools/maestro-${tools.maestroVersion}/maestro/bin/maestro`)
const appId = 'com.ray.mobile.e2e'
const iosRuntime = tools.iosRuntime
const avdName = `ray-e2e-${runId}`
const arch = process.arch === 'arm64' ? 'arm64-v8a' : 'x86_64'

try {
  const maestroVersion = await command(maestro, ['--version'])
  if (!maestroVersion.split(/\s+/).includes(tools.maestroVersion))
    throw new Error(`Expected Maestro ${tools.maestroVersion}; got ${maestroVersion}`)
  const javaVersion = await command('java', ['-version'])
  if (!javaVersion.includes(`version "${tools.javaMajor}.`)) throw new Error(`Java ${tools.javaMajor} is required`)
  if (platform === 'ios') {
    const xcode = await command('xcodebuild', ['-version'])
    if (!xcode.startsWith(`Xcode ${tools.xcodeVersion}\n`))
      throw new Error(`Expected Xcode ${tools.xcodeVersion} (Expo 57 requires 26.4 or newer): ${xcode}`)
    const runtimes = JSON.parse(await command('xcrun', ['simctl', 'list', 'runtimes', '-j']))
    if (!runtimes.runtimes.some(runtime => runtime.identifier === iosRuntime && runtime.isAvailable))
      throw new Error(`Missing simulator runtime: ${iosRuntime}`)
  } else {
    await stat(
      resolve(sdk, `system-images/android-${tools.androidApi}/${tools.androidImageVariant}/${arch}/system.img`)
    )
    const imageProperties = await readFile(
      resolve(sdk, `system-images/android-${tools.androidApi}/${tools.androidImageVariant}/${arch}/source.properties`),
      'utf8'
    )
    if (!imageProperties.includes(`Pkg.Revision=${tools.androidImageRevision}\n`))
      throw new Error('Android system image revision differs from mobile-tools.json')
    env.ANDROID_HOME = sdk
    env.ANDROID_SDK_ROOT = sdk
  }

  await new Promise((resolveReady, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveReady)
  })
  const port = server.address().port
  env.EXPO_PUBLIC_API_BASE_URL = `http://127.0.0.1:${port}`
  env.EXPO_PUBLIC_SITE_URL = env.EXPO_PUBLIC_API_BASE_URL
  workspace = await mkdtemp(resolve(tmpdir(), `ray-mobile-${platform}-`))
  const files = (
    await command('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { captureAll: true })
  ).split('\0')
  for (const file of new Set(files)) {
    if (!file || /(^|\/)\.env(?:[./]|$)/.test(file)) continue
    if (!file.startsWith('apps/mobile/') && !file.startsWith('libs/') && file.includes('/')) continue
    const target = resolve(workspace, file)
    await mkdir(dirname(target), { recursive: true })
    try {
      await copyFile(resolve(root, file), target)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  await symlink(resolve(root, 'node_modules'), resolve(workspace, 'node_modules'), 'dir')
  await symlink(resolve(root, 'apps/mobile/node_modules'), resolve(workspace, 'apps/mobile/node_modules'), 'dir')
  const app = resolve(workspace, 'apps/mobile')
  const expo = resolve(app, 'node_modules/expo/bin/cli')
  await command(
    process.execPath,
    [expo, 'prebuild', '--platform', platform, '--no-install', '--skip-dependency-update', 'react,react-native'],
    { cwd: app, timeout: 300_000 }
  )
  console.log(`Mobile ${platform}: native project prepared; building embedded release bundle.`)
  let artifact
  if (platform === 'android') {
    // Expo's generated release variant uses the debug keystore for this isolated app.
    await command(
      'sh',
      ['./gradlew', 'assembleRelease', '--no-daemon', '--max-workers=2', `-PreactNativeArchitectures=${arch}`],
      { cwd: resolve(app, 'android'), timeout: 2_700_000 }
    )
    artifact = resolve(report, 'app-release.apk')
    await copyFile(resolve(app, 'android/app/build/outputs/apk/release/app-release.apk'), artifact)
    env.ANDROID_AVD_HOME = resolve(workspace, 'avd')
    await mkdir(env.ANDROID_AVD_HOME)
    await command(
      avdmanager,
      [
        'create',
        'avd',
        '--name',
        avdName,
        '--package',
        `system-images;android-${tools.androidApi};${tools.androidImageVariant};${arch}`,
        '--device',
        'pixel_6'
      ],
      { input: 'no\n' }
    )
    // Choose an unused even console port; the emulator reserves its companion port.
    const devices = await command(adb, ['devices'])
    let consolePort = 5554
    while (devices.includes(`emulator-${consolePort}`)) consolePort += 2
    device = `emulator-${consolePort}`
    emulator = command(
      resolve(sdk, 'emulator/emulator'),
      [
        '-avd',
        avdName,
        '-port',
        String(consolePort),
        '-no-window',
        '-no-audio',
        '-no-snapshot',
        '-gpu',
        'swiftshader_indirect',
        '-memory',
        '2048'
      ],
      { background: true, timeout: 900_000 }
    )
    await command(adb, ['-s', device, 'wait-for-device'])
    const deadline = Date.now() + 180_000
    while ((await command(adb, ['-s', device, 'shell', 'getprop', 'sys.boot_completed'])) !== '1') {
      if (Date.now() > deadline || emulator.child.exitCode !== null) throw new Error('Android emulator failed to boot')
      await new Promise(resolveTick => setTimeout(resolveTick, 1000))
    }
    const actualAvd = await command(adb, ['-s', device, 'emu', 'avd', 'name'])
    if (!actualAvd.split(/\s+/).includes(avdName)) throw new Error('Refusing to use an emulator owned by another run')
    deviceOwned = true
    await command(adb, ['-s', device, 'reverse', `tcp:${port}`, `tcp:${port}`])
    await command(adb, ['-s', device, 'install', '-r', artifact])
  } else {
    await command('pod', ['install'], { cwd: resolve(app, 'ios'), timeout: 900_000 })
    const derived = resolve(workspace, 'derived')
    await command(
      'xcodebuild',
      [
        '-jobs',
        '2',
        '-workspace',
        'RayE2E.xcworkspace',
        '-scheme',
        'RayE2E',
        '-configuration',
        'Release',
        '-sdk',
        'iphonesimulator',
        '-destination',
        'generic/platform=iOS Simulator',
        '-derivedDataPath',
        derived,
        'CODE_SIGNING_ALLOWED=NO',
        `ARCHS=${process.arch === 'arm64' ? 'arm64' : 'x86_64'}`,
        'build'
      ],
      { cwd: resolve(app, 'ios'), timeout: 2_700_000 }
    )
    artifact = resolve(report, 'RayE2E.app')
    await cp(resolve(derived, 'Build/Products/Release-iphonesimulator/RayE2E.app'), artifact, { recursive: true })
    // Preserve executable permissions when GitHub uploads/downloads this artifact.
    await command('tar', ['-czf', resolve(report, 'RayE2E.app.tar.gz'), '-C', report, 'RayE2E.app'])
    device = await command('xcrun', ['simctl', 'create', avdName, tools.iosDeviceType, iosRuntime])
    deviceOwned = true
    await command('xcrun', ['simctl', 'boot', device])
    await command('xcrun', ['simctl', 'bootstatus', device, '-b'], { timeout: 180_000 })
    await command('xcrun', ['simctl', 'install', device, artifact])
  }
  const screenshots = resolve(report, 'screenshots')
  await mkdir(screenshots)
  console.log(`Mobile ${platform}: ${device} ready; running Maestro flows.`)
  await command(
    maestro,
    [
      '--device',
      device,
      'test',
      '--format',
      'JUNIT',
      '--output',
      resolve(report, 'junit.xml'),
      '--test-output-dir',
      resolve(report, 'maestro'),
      '--debug-output',
      resolve(report, 'debug'),
      '-e',
      `SCREENSHOT_DIR=${screenshots}`,
      resolve(root, 'apps/mobile/.maestro')
    ],
    { timeout: 600_000 }
  )
  if (!(await readFile(resolve(report, 'junit.xml'), 'utf8')).includes('<testcase'))
    throw new Error('Maestro produced no test cases')
  if (!requests.some(request => request.path === '/api/auth/get-session'))
    throw new Error('The app never reached the signed-out session fixture')
  passed = !interrupted
} catch (error) {
  console.error(error.message)
  log.write(`${error.stack}\n`)
  process.exitCode = 1
} finally {
  cleaning = true
  async function cleanup(action) {
    try {
      await action()
    } catch (error) {
      cleaned = false
      log.write(`Cleanup: ${error.message}\n`)
      process.exitCode = 1
    }
  }
  if (deviceOwned) {
    if (platform === 'android') {
      await cleanup(async () =>
        writeFile(resolve(report, 'device.log'), await command(adb, ['-s', device, 'logcat', '-d', '-t', '2000']))
      )
    } else {
      await cleanup(() =>
        command('xcrun', [
          'simctl',
          'spawn',
          device,
          'log',
          'show',
          '--last',
          '5m',
          '--predicate',
          `process == "RayE2E"`
        ])
      )
      await cleanup(() => command('xcrun', ['simctl', 'shutdown', device]))
      await cleanup(() => command('xcrun', ['simctl', 'delete', device]))
    }
  }
  for (const child of children) {
    try {
      terminateProcessTree(child.pid, 'SIGKILL')
    } catch {
      /* exited */
    }
  }
  if (emulator) await emulator.completion.catch(() => {})
  server.closeAllConnections()
  await new Promise(resolveClosed => server.close(resolveClosed))
  if (workspace) await cleanup(() => rm(workspace, { recursive: true, force: true }))
  await writeFile(resolve(report, 'fixture-requests.json'), JSON.stringify(requests, null, 2))
  await writeFile(
    resolve(report, 'run.json'),
    JSON.stringify(
      {
        platform,
        runId,
        appId,
        tools,
        iosRuntime: platform === 'ios' ? iosRuntime : undefined,
        passed,
        cleaned,
        interrupted
      },
      null,
      2
    )
  )
  await new Promise(resolveLog => log.end(resolveLog))
  process.removeListener('SIGINT', interrupt)
  process.removeListener('SIGTERM', interrupt)
  console.log(`Mobile ${platform}: ${passed && cleaned ? 'passed' : 'failed'}; reports: ${report}`)
}
