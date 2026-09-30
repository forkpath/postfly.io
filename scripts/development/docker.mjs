import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { resolve } from 'node:path'

// Development Compose uses public images only. An isolated client config avoids
// opening a personal keychain in a noninteractive bootstrap, without changing it.
export async function withPublicRegistry(env, endpoint, operation) {
  const original = env.DOCKER_CONFIG || resolve(homedir(), '.docker')
  let pluginDirectories = []
  try {
    const config = JSON.parse(await readFile(resolve(original, 'config.json'), 'utf8'))
    pluginDirectories = (config.cliPluginsExtraDirs ?? []).filter(value => typeof value === 'string')
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Cannot read Docker CLI plugin configuration')
  }
  const directory = await mkdtemp(resolve(tmpdir(), 'ray-public-docker-'))
  try {
    await writeFile(
      resolve(directory, 'config.json'),
      JSON.stringify({
        // Nonempty auths also prevents Docker auto-detecting a native credential helper.
        auths: { 'https://index.docker.io/v1/': {} },
        cliPluginsExtraDirs: [...pluginDirectories, resolve(original, 'cli-plugins')]
      }),
      { mode: 0o600 }
    )
    const dockerEnv = { ...env, DOCKER_CONFIG: directory, DOCKER_HOST: endpoint }
    delete dockerEnv.DOCKER_CONTEXT
    delete dockerEnv.DOCKER_AUTH_CONFIG
    return await operation(dockerEnv)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
