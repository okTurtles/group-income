'use strict'

const utils = require('pug-lint/lib/utils')

const example = '`:href=\'ALLOWED_URLS.ISSUE_PAGE\'`'
const excludedFiles = ['frontend/views/pages/BypassUI.vue', 'frontend/views/pages/DesignSystem.vue', 'frontend/views/containers/chatroom/LinkPreview.vue']
const UNEXPECTED_DYNAMIC_HREF = `Dynamic hrefs are no longer allowed out of safety concern, unless it is e.g. ${example}.`
const UNEXPECTED_LITERAL_EXTERNAL_HREF = `Literal external hrefs are no longer allowed out of safety and maintainability concerns. Please use e.g. ${example}.`

module.exports = function () {}

module.exports.prototype = {
  name: 'validateHrefs',

  schema: {
    enum: [null, true]
  },

  configure (options) {
    utils.validateTrueOptions(this.name, options)
  },

  lint (file, errors) {
    // Hacky workaround for `excludeFiles` config option not working.
    if (excludedFiles.includes(file.getFilename().replace(/\\/g, '/'))) return
    file.iterateTokensByType('attribute', (token) => {
      if (token.name === 'href') {
        const tokenValue = token.val.slice(1, -1)

        // Checks if a literal external href was used. Hrefs starting with '#' or '/' are not external.
        if (tokenValue[0] !== '#' && tokenValue[0] !== '/') {
          errors.add(UNEXPECTED_LITERAL_EXTERNAL_HREF, token.line, token.col)
        }
      } else if (token.name === ':href') {
        const tokenValue = token.val.slice(1, -1)

        // Checks if an unknown dynamic href was used. Properties of `ALLOWED_URLS` have been whitelisted.
        if (!/^"[#/]" ?\+/.test(tokenValue) && !tokenValue.startsWith('ALLOWED_URLS.')) {
          errors.add(UNEXPECTED_DYNAMIC_HREF, token.line, token.col)
        }
      }
    })
  }
}
