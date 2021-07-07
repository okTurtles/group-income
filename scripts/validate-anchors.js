'use strict'

const assert = require('assert')
const utils = require('pug-lint/lib/utils')

const example = '`:href=\'ALLOWED_URLS.ISSUE_PAGE\'`'
const excludedFiles = ['frontend/views/pages/BypassUI.vue', 'frontend/views/pages/DesignSystem.vue', 'frontend/views/containers/chatroom/LinkPreview.vue']
const INVALID_REL_ATTRIBUTE = 'The `rel` attribute should include both "noopener" and "noreferrer".'
const REL_ATTRIBUTE_EXPECTED = 'The `rel` attribute should be present and include at least "noopener" and "noreferrer".'
const UNEXPECTED_DYNAMIC_HREF = `Dynamic hrefs are no longer allowed out of safety concern, unless it is e.g. ${example}.`
const UNEXPECTED_LITERAL_EXTERNAL_HREF = `Literal external hrefs are no longer allowed out of safety and maintainability concerns. Please use e.g. ${example}.`

module.exports = function () {}

module.exports.prototype = {
  name: 'validateAnchors',

  schema: {
    enum: [null, true]
  },

  configure (options) {
    utils.validateTrueOptions(this.name, options)
  },

  lint (file, errors) {
    // Hacky workaround for `excludeFiles` config option not working.
    if (excludedFiles.includes(file.getFilename().replace(/\\/g, '/'))) return
    file.iterateTokensByType('tag', (token) => {
      // This rule only applies to anchor links.
      if (token.val !== 'i18n' && token.val !== 'a') {
        return
      }
      let nextToken = file.getNextToken(token)

      // Skip class tokens.
      while (nextToken && nextToken.type === 'class') {
        nextToken = file.getNextToken(nextToken)
      }
      // Collects attribute tokens by their name.
      const attributeTokensByName = {}

      if (nextToken && nextToken.type === 'start-attributes') {
        nextToken = file.getNextToken(nextToken)

        while (nextToken && nextToken.type === 'attribute') {
          attributeTokensByName[nextToken.name] = nextToken
          nextToken = file.getNextToken(nextToken)
        }
        // The next token should be an 'end-attributes' token.
        assert.equal(nextToken && nextToken.type, 'end-attributes')
      }

      // i18n elements are not anchor links unless their `tag` attribute is `'a'`.
      if (token.tag === 'i18n' && attributeTokensByName.tag !== 'a') {
        return
      }
      // If we are dealing with a hyperlink opening in a new tab, then validate its `rel` attribute.
      if (attributeTokensByName.target && attributeTokensByName.target.val === '\'_blank\'') {
        const relToken = attributeTokensByName.rel
        const rel = relToken?.val

        // Checks if the `rel` attribute is present and non-empty.
        if (!rel) {
          errors.add(REL_ATTRIBUTE_EXPECTED, nextToken.line, nextToken.col)
          // Checks if the `rel` attribute value contains both "noopener" and "noreferrer".
        } else if (!/\bnoopener\b/.test(rel) || !/\bnoreferrer\b/.test(rel)) {
          errors.add(INVALID_REL_ATTRIBUTE, relToken.line, relToken.col)
        }
      }

      if (attributeTokensByName.href) {
        const hrefToken = attributeTokensByName.href
        const href = hrefToken.val.slice(1, -1)

        // Checks if an unknown literal external href was used. Hrefs starting with '#' or '/' are not external.
        if (href[0] !== '#' && href[0] !== '/') {
          errors.add(UNEXPECTED_LITERAL_EXTERNAL_HREF, hrefToken.line, hrefToken.col)
        }
      } else if (attributeTokensByName[':href']) {
        const hrefToken = attributeTokensByName[':href']
        const href = hrefToken.val.slice(1, -1)

        // Checks if an unknown dynamic href was used. Properties of `ALLOWED_URLS` have been whitelisted.
        if (!/^"[#/]" ?\+/.test(href) && !href.startsWith('ALLOWED_URLS.')) {
          errors.add(UNEXPECTED_DYNAMIC_HREF, hrefToken.line, hrefToken.col)
        }
      }
    })
  }
}
