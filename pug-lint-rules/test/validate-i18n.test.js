'use strict'

const assert = require('assert')

const PugLinter = require('pug-lint')

const linter = new PugLinter()

linter.configure(
  {
    additionalRules: ['pug-lint-rules/*.js'],
    validateI18n: true
  }
)

const errorCode = 'PUG:LINT_VALIDATEI18N'

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

it('should allow valid usage of a simple string', function () {
  const validUseCase = 'i18n Hello world'

  assert.equal(linter.checkString(validUseCase).length, 0, validUseCase)
})

it('should allow valid usage of a string with named arguments', function () {
  const validUseCase = outdent(
    String.raw`
    i18n(
      :args='{ name: ourUsername }'
    ) Hello {name}!`
  )

  assert.equal(linter.checkString(validUseCase).length, 0, validUseCase)
})

it('should allow valid usage of a string containing HTML markup', function () {
  const validUseCase = outdent(
    String.raw`
    i18n(
      :args='{ ...LTags("strong", "span"), name: ourUsername }'
    ) Hello {strong_}{name}{_strong}, today it's a {span_}nice day{_span}!`
  )

  assert.equal(linter.checkString(validUseCase).length, 0, validUseCase)
})

it('should allow valid usage of a string continaing Vue markup', function () {
  const validUseCase = outdent(
    String.raw`
    i18n(
      compile
      :args='{ r1: \'<router-link class="link" to="/login">\', r2: "</router-link>"}'
    ) Go to {r1}login{r2} page.`
  )

  assert.equal(linter.checkString(validUseCase).length, 0, validUseCase)
})

// ====== Invalid usages ====== //

it('should report syntax errors in the `:args` attribute', function () {
  let errors = []
  let invalidUseCase = ''

  // Example with a missing colon.
  invalidUseCase = outdent(
    String.raw`
    i18n(
      :args='{ name ourUsername }'
    ) Hello {name}!`
  )

  errors = linter.checkString(invalidUseCase)
  assert.equal(errors.length, 2)
  assert.equal(errors[0].code, errorCode)
  assert.match(errors[0].message, /unexpected token/i)

  assert.equal(errors[1].code, errorCode)
  assert.match(errors[1].message, /undefined named argument 'name'/i)

  // Example with a missing curly brace.
  invalidUseCase = outdent(
    String.raw`
    i18n(
      :args='{ name: ourUsername'
    ) Hello {name}!`
  )

  errors = linter.checkString(invalidUseCase)

  assert.equal(errors.length, 2)
  assert.equal(errors[0].code, errorCode)
  assert.match(errors[0].message, /unexpected token/i)

  assert.equal(errors[1].code, errorCode)
  assert.match(errors[1].message, /undefined named argument 'name'/i)

  // Example with an extraneous semicolon.
  invalidUseCase = outdent(
    String.raw`
    i18n(
      :args='{ name: ourUsername };'
    ) Hello {name}!`
  )

  errors = linter.checkString(invalidUseCase)
  assert.equal(errors.length, 1)

  // Example with an invalid property key.
  invalidUseCase = outdent(
    String.raw`
    i18n(
      :args='{ 0name: ourUsername };'
    ) Hello {name}!`
  )

  errors = linter.checkString(invalidUseCase)
  assert(linter.checkString(invalidUseCase).length > 0, invalidUseCase)
})

it('should report undefined ltags', function () {
  const invalidUseCase = outdent(
    String.raw`
    i18n(
      :args='{ count: 5 }'
    ) Invite {strong_}{count} members{_strong} to the party!`
  )
  const errors = linter.checkString(invalidUseCase)

  assert.equal(errors.length, 2)
  assert.equal(errors[0].code, errorCode)
  assert.match(errors[0].message, /undefined named argument 'strong_'/i)
  assert.equal(errors[1].code, errorCode)
  assert.match(errors[1].message, /undefined named argument '_strong'/i)
})

it('should report undefined named arguments', function () {
  const invalidUseCase = outdent(
    String.raw`
    i18n(
      :args='{ ...LTags("strong") }'
    ) Invite {strong_}{count} members{_strong} to the party!`
  )
  const errors = linter.checkString(invalidUseCase)

  assert.equal(errors.length, 1)
  assert.equal(errors[0].code, errorCode)
  assert.match(errors[0].message, /undefined named argument 'count'/i)
})

it('should report unused ltags', function () {
  const invalidUseCase = outdent(
    String.raw`
    i18n(
      :args='{ ...LTags("strong") }'
    ) Invite your friends to the party!`
  )
  const errors = linter.checkString(invalidUseCase)

  assert.equal(errors.length, 2)
  assert.equal(errors[0].code, errorCode)
  assert.match(errors[0].message, /unused named argument 'strong_'/i)
  assert.equal(errors[1].code, errorCode)
  assert.match(errors[1].message, /unused named argument '_strong'/i)
})

it('should report unused named arguments', function () {
  const invalidUseCase = outdent(
    String.raw`
    i18n(
      :args='{ age, name }'
    ) Hello {name}!`
  )
  const errors = linter.checkString(invalidUseCase)

  assert.equal(errors.length, 1)
  assert.equal(errors[0].code, errorCode)
  assert.match(errors[0].message, /unused named argument 'age'/i)
})

it('should report usage of the `html` attribute', function () {
  const invalidUseCase = outdent(
    String.raw`
    i18n(
      tag='p'
      html='My <b>great</b> text'
    ) Hello`
  )

  const errors = linter.checkString(invalidUseCase)
  assert.equal(errors.length, 1)
  assert.equal(errors[0].code, errorCode)
  assert.match(errors[0].message, /html attribute/)
})
