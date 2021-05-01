'use strict'

const assert = require('assert')

const PugLinter = require('pug-lint')

const linter = new PugLinter()

linter.configure(
  {
    additionalRules: ['scripts/disallow-vhtml-directive.js'],
    disallowVHTMLDirective: true
  }
)

const errorCode = 'PUG:LINT_DISALLOWVHTMLDIRECTIVE'

function outdent (str) {
  const lines = str.slice(1).split('\n')
  const indent = (lines[0].match(/^\s*/) || [''])[0]

  if (indent === '') {
    return lines.join('\n')
  }
  return lines.map(
    line => line.startsWith(indent) ? line.slice(indent.length) : line
  ).join('\n')
}

it('should allow usage of the `v-safe-html` directive', function () {
  const validUseCase = outdent(
    String.raw`
    p.p-description
      span.has-text-1(v-safe-html='introTitle')`
  )

  assert.equal(linter.checkString(validUseCase).length, 0, validUseCase)
})

it('should disallow any usage of the `v-html` directive', function () {
  const invalidUseCase = outdent(
    String.raw`
    p.p-description
      span.has-text-1(v-html='introTitle')`
  )

  const errors = linter.checkString(invalidUseCase)
  assert.equal(errors.length, 1)
  assert.equal(errors[0].code, errorCode)
})
