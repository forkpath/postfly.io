const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin')
const { join } = require('path')

module.exports = {
  output: {
    path: join(__dirname, '../../dist/services/pulse'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]'
    })
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      // Keep dev startup fast; Nx typecheck and production builds enforce types.
      typeCheckOptions: process.env.NODE_ENV !== 'development',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: [],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      // Prisma generated sources are excluded from the Nx dependency scan.
      runtimeDependencies: ['@prisma/client', 'tslib'],
      sourceMap: true
    })
  ]
}
