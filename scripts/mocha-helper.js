'use strict'

// https://babeljs.io/docs/en/babel-register/
// https://github.com/tleunen/babel-plugin-module-resolver
//
// We register babel-plugin-module-resolver only here so that we don't
// step on the toes of esbuild when resolving @common via our custom esbuild alias plugin
require('@babel/register')({
  // `@babel/preset-typescript` in `.babelrc` is not enough on its own: the
  // require hook only intercepts the extensions listed here, which default to
  // ['.js', '.jsx', '.es6', '.es', '.mjs', '.cjs'] and exclude '.ts'. Without
  // this, the first test that reaches a converted file fails at `require` time
  // with a syntax error that looks like a Babel misconfiguration.
  extensions: ['.js', '.jsx', '.es6', '.es', '.mjs', '.cjs', '.ts'],
  plugins: [
    ['module-resolver', {
      'alias': {
        '@common': './frontend/common'
      }
    }]
  ]
})
