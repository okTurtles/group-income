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

// Tests involving localization may depend on the user locale being 'en-US'.
// For example, currencies.test.js.
// https://github.com/okTurtles/group-income/issues/3164
// See also 'window:before:load' in ~/test/cypress/support/index.js.
if (typeof globalThis.navigator === 'object' && globalThis.navigator.language !== 'en-US') {
  Object.defineProperty(globalThis.navigator, 'language', { value: 'en-US', configurable: true })
  Object.defineProperty(globalThis.navigator, 'languages', { value: ['en-US', 'en'], configurable: true })
}
