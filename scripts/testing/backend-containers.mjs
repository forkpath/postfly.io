import { resolve } from 'node:path'

import { GenericContainer, Network, PullPolicy, Wait } from 'testcontainers'

export const TEST_RUN_LABEL = 'io.ray.test.run'

const images = {
  postgres: 'docker.io/library/postgres:17@sha256:2203e6282d9e7de7c24d7da234e2a744fb325df366a3fd8ed940e8abbee39527',
  redis: 'docker.io/library/redis:7.4@sha256:33d7c9a245edd95e6703a0addbeaa48fe40c3b3b4783627a72085155462ebfdb',
  mongo: 'docker.io/library/mongo:8.0@sha256:45b422ba19c0f028a917ea43746ab8e8cdbdaaeb50d2e6e634a17c59666e0dbb',
  rabbitmq:
    'docker.io/library/rabbitmq:4.0.1-management@sha256:9b471f8528a5beee7a6913d49bc450ffd92b3d0d9732f8febc448d291f5d150b'
}

// GenericContainer exposes lifecycle hooks and protected Docker create options.
// Bind random ports only to loopback; remote Docker hosts are deliberately unsupported.
class LoopbackContainer extends GenericContainer {
  async beforeContainerCreated() {
    for (const bindings of Object.values(this.hostConfig.PortBindings ?? {})) {
      for (const binding of bindings) binding.HostIp = '127.0.0.1'
    }
  }
}

export function backendServices(project, suite) {
  if (suite === 'integration') return project === 'worker' ? ['postgres'] : ['postgres', 'redis']
  if (project === 'pulse') return ['postgres', 'redis']
  if (project === 'worker') return ['postgres', 'mongo', 'rabbitmq']
  return ['postgres', 'redis', 'mongo', 'rabbitmq']
}

export class BackendContainers {
  containers = new Map()
  network

  constructor({ namespace, database, password, root, assertRunning, inspect, progress }) {
    Object.assign(this, { namespace, database, password, root, assertRunning, inspect, progress })
  }

  async start(services) {
    this.assertRunning()
    this.network = await new Network().start()
    for (const service of services) {
      this.assertRunning()
      const container = this.builder(images[service], service)
      const { password, database } = this
      if (service === 'postgres') {
        container
          .withEnvironment({ POSTGRES_USER: 'ray_test', POSTGRES_PASSWORD: password, POSTGRES_DB: database })
          .withExposedPorts(5432)
          .withHealthCheck({
            test: ['CMD-SHELL', 'pg_isready -U ray_test -d "$POSTGRES_DB"'],
            interval: 2000,
            timeout: 3000,
            retries: 60
          })
      } else if (service === 'redis') {
        container
          .withEnvironment({ REDISCLI_AUTH: password })
          .withCommand(['redis-server', '--requirepass', password])
          .withExposedPorts(6379)
          .withHealthCheck({ test: ['CMD', 'redis-cli', 'ping'], interval: 2000, timeout: 3000, retries: 60 })
      } else if (service === 'mongo') {
        container
          .withEnvironment({
            MONGO_INITDB_ROOT_USERNAME: 'root',
            MONGO_INITDB_ROOT_PASSWORD: password,
            MONGO_INITDB_DATABASE: database,
            RAY_TEST_PASSWORD: password
          })
          .withCopyFilesToContainer([
            {
              source: resolve(this.root, 'docker/test/mongo-init.js'),
              target: '/docker-entrypoint-initdb.d/01-test-user.js'
            }
          ])
          .withExposedPorts(27017)
          .withHealthCheck({
            test: [
              'CMD-SHELL',
              'mongosh --quiet -u ray_test -p "$RAY_TEST_PASSWORD" --authenticationDatabase "$MONGO_INITDB_DATABASE" --eval "db.adminCommand({ping:1}).ok"'
            ],
            interval: 5000,
            timeout: 20000,
            retries: 45
          })
      } else {
        container
          .withEnvironment({
            RABBITMQ_DEFAULT_USER: 'ray_test',
            RABBITMQ_DEFAULT_PASS: password,
            RABBITMQ_DEFAULT_VHOST: database,
            RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS: '+S 2:2 +A 4',
            RABBITMQ_CTL_ERL_ARGS: '+S 1:1 +A 1'
          })
          .withExposedPorts(5672, 15672)
          .withHealthCheck({
            test: ['CMD', 'gosu', 'rabbitmq', 'rabbitmq-diagnostics', '-q', 'check_running'],
            startPeriod: 30000,
            interval: 5000,
            timeout: 20000,
            retries: 45
          })
      }
      await this.launch(
        service,
        container.withWaitStrategy(Wait.forAll([Wait.forHealthCheck(), Wait.forListeningPorts()]))
      )
    }
  }

  builder(image, service) {
    return new LoopbackContainer(image)
      .withLabels({ [TEST_RUN_LABEL]: this.namespace })
      .withNetwork(this.network)
      .withNetworkAliases(service)
      .withStartupTimeout(240_000)
  }

  async launch(service, builder) {
    this.assertRunning()
    this.progress(`Starting ${service}`)
    const container = await builder.start()
    this.containers.set(service, container)
    this.assertRunning()
    if (!['127.0.0.1', 'localhost', '::1'].includes(container.getHost()))
      throw new Error('Tests require a local Docker host')
    const info = await this.inspect(container.getId())
    for (const bindings of Object.values(info.NetworkSettings.Ports ?? {})) {
      for (const binding of bindings ?? []) {
        if (binding.HostIp !== '127.0.0.1') throw new Error('Test port is not bound exclusively to loopback')
      }
    }
    this.progress(`Ready: ${service}`)
    return container
  }

  port(service, internal) {
    return String(this.containers.get(service).getMappedPort(internal))
  }

  async release({ prefix, tag, secret }) {
    const environment = {
      NODE_ENV: 'production',
      POSTGRES_DATABASE_URL: `postgresql://ray_test:${this.password}@postgres:5432/${this.database}`,
      REDIS_HOST: 'redis',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: this.password,
      MONGO_HOST: 'mongo',
      MONGO_PORT: '27017',
      MONGO_INITDB_ROOT_USERNAME: 'ray_test',
      MONGO_INITDB_ROOT_PASSWORD: this.password,
      MONGO_INITDB_DATABASE: this.database,
      RABBITMQ_URI: `amqp://ray_test:${this.password}@rabbitmq:5672/${this.database}`,
      BETTER_AUTH_SECRET: secret,
      BETTER_AUTH_URL: 'http://127.0.0.1:4178',
      LOGGER_FILE_ENABLED: 'false',
      LOGGER_FILE_COMPRESS: 'false',
      LOGGER_LEVEL: 'warn',
      EMAIL_FROM: 'framework-test@example.invalid'
    }
    const image = service => this.builder(`${prefix}/${service}:${tag}`, service).withPullPolicy(PullPolicy.neverPull())
    await this.launch(
      'migrator',
      image('migrator')
        .withEnvironment({ POSTGRES_DATABASE_URL: environment.POSTGRES_DATABASE_URL })
        .withWaitStrategy(Wait.forOneShotStartup())
    )
    for (const [service, port, path] of [
      ['engine', 8000, '/api/v1/health'],
      ['pulse', 3001, '/ready'],
      ['worker', 3002, '/ready'],
      ['web', 3000, '/']
    ]) {
      const serviceEnv =
        service === 'web'
          ? { NODE_ENV: 'production', HOST: '0.0.0.0', PORT: '3000', API_BASE_URL: 'http://engine:8000' }
          : { ...environment, [`${service.toUpperCase()}_PORT`]: String(port) }
      await this.launch(
        service,
        image(service).withEnvironment(serviceEnv).withExposedPorts(port).withWaitStrategy(Wait.forHttp(path, port))
      )
    }
  }

  async stop() {
    const failures = []
    for (const container of [...this.containers.values()].reverse()) {
      try {
        await container.stop({ timeout: 10_000, remove: true, removeVolumes: true })
      } catch (error) {
        failures.push(error)
      }
    }
    // Partial startup failures are removed by the runner's scoped Docker sweep
    // before stopping this network. Ryuk additionally handles unexpected exits.
    return failures
  }
}
