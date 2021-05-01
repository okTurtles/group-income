'use strict'

const utils = require('pug-lint/lib/utils')

const UNEXPECTED_VHTML_DIRECTIVE = 'The `v-html` directive is no longer allowed out of safety concern. Please use `v-safe-html` instead.'

module.exports = function () {}

module.exports.prototype = {
  name: 'disallowVHTMLDirective',

  schema: {
    enum: [null, true]
  },

  configure (options) {
    utils.validateTrueOptions(this.name, options)
  },

  lint (file, errors) {
    file.iterateTokensByType('attribute', (token) => {
      // Checks if the v-html directive was used.
      if (token.name === 'v-html') {
        errors.add(UNEXPECTED_VHTML_DIRECTIVE, token.line, token.col)
      }
    })
  }
}
