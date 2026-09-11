import baseConfig from '../../eslint.config.mjs'

export default [
  ...baseConfig,
  {
    ignores: ['src/i18n/i18n.types.ts']
  }
]
