const types = ['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test', 'arch']
const scopes = ['desktop', 'extension', 'mobile', 'web', 'engine', 'pulse', 'worker', 'studio', 'libs', 'docker', 'ai']
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', types],
    'scope-enum': [2, 'always', scopes]
  }
}
