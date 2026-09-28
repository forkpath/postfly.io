const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin')
const { resolve } = require('node:path')

// Use the production compiler and module resolver for the real child process.
module.exports = {
  output: {
    path: resolve(process.env.RAY_TEST_REPORT_DIR ?? '../../dist/test-results/worker/e2e', 'process'),
    clean: true
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './tests/worker-process.ts',
      tsConfig: './tsconfig.e2e-process.json',
      assets: [],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true
    })
  ]
}
