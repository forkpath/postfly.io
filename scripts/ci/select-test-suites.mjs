import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

export function selectTestSuites({ affected, files, full }) {
  const harnessChanged = files.some(file =>
    /^(scripts\/(testing|ci|release)\/|docker\/|patches\/|\.github\/(workflows|actions)\/)/.test(file)
  )
  const all = full || harnessChanged
  const has = project => all || affected.includes(project)
  const nativeChanged = files.some(file =>
    /^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|apps\/mobile\/(package\.json|app\.config\.|eas\.json|metro\.config\.|plugins\/))/.test(
      file
    )
  )
  return {
    full: all,
    backend: ['engine', 'pulse', 'worker'].filter(has),
    extension: has('extension'),
    desktop: has('desktop'),
    web: has('web') || has('web-e2e'),
    generator: has('ray-plugin') || files.includes('ray.resources.json'),
    mobileAndroid: has('mobile'),
    mobileIos: has('mobile') && (all || nativeChanged)
  }
}

function main() {
  const require = createRequire(import.meta.url)
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const base = event.pull_request?.base.sha ?? event.before
  let full =
    process.env.CI_FULL === 'true' ||
    ['schedule', 'workflow_dispatch', 'workflow_call'].includes(process.env.GITHUB_EVENT_NAME) ||
    process.env.GITHUB_REF === `refs/heads/${event.repository.default_branch}` ||
    process.env.GITHUB_REF?.startsWith('refs/tags/') ||
    !base ||
    /^0+$/.test(base)
  let affected = []
  let files = []
  if (!full) {
    try {
      execFileSync('git', ['cat-file', '-e', `${base}^{commit}`], { stdio: 'pipe' })
    } catch {
      full = true
    }
  }
  if (!full) {
    files = execFileSync('git', ['diff', '--name-only', '-z', base, head], { encoding: 'utf8' })
      .split('\0')
      .filter(Boolean)
    // Graph/config failures fail the selection job rather than omitting suites.
    affected = JSON.parse(
      execFileSync(
        process.execPath,
        [require.resolve('nx/bin/nx'), 'show', 'projects', '--affected', `--base=${base}`, `--head=${head}`, '--json'],
        {
          encoding: 'utf8',
          env: { ...process.env, NX_DAEMON: 'false' },
          maxBuffer: 16 * 1024 * 1024
        }
      )
    )
  }
  const suites = selectTestSuites({ affected, files, full })
  const output = {
    full: suites.full,
    base: suites.full ? '' : base,
    head,
    backend: JSON.stringify({ project: suites.backend }),
    backendEnabled: suites.backend.length > 0,
    extension: suites.extension,
    desktop: suites.desktop,
    web: suites.web,
    generator: suites.generator,
    mobileAndroid: suites.mobileAndroid,
    mobileIos: suites.mobileIos,
    mobile: JSON.stringify({
      include: [
        ...(suites.mobileAndroid ? [{ platform: 'android', os: 'ubuntu-24.04' }] : []),
        ...(suites.mobileIos ? [{ platform: 'ios', os: 'macos-26' }] : [])
      ]
    })
  }
  for (const [key, value] of Object.entries(output)) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`)
  console.log(JSON.stringify({ ...output, affected }, null, 2))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
