'use strict'

// https://babeljs.io/docs/en/babel-register/
// https://github.com/tleunen/babel-plugin-module-resolver
//
// We register babel-plugin-module-resolver only here so that we don't
// step on the toes of esbuild when resolving @common via our custom esbuild alias plugin
require('@babel/register')({
  plugins: [
    ['module-resolver', {
      'alias': {
        '@common': './frontend/common'
      }
    }]
  ]
})
