/** Refuse fixture writes unless the public runner created a local test database. */
export function assertIsolatedTestEnvironment(env = process.env) {
  const runId = env['RAY_TEST_RUN_ID']
  let url: URL
  try {
    url = new URL(env['POSTGRES_DATABASE_URL'] ?? '')
  } catch {
    throw new Error('Missing isolated backend test database URL.')
  }
  if (
    !runId ||
    !/^[a-f0-9]{16}$/.test(runId) ||
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    url.hostname !== '127.0.0.1' ||
    url.pathname !== `/ray_test_${runId}`
  ) {
    throw new Error('Use the public e2e/test-integration target to create an isolated backend test environment.')
  }
}
