import {
  assert,
  assertEquals,
  assertMatch
} from 'asserts'

import { createRequire } from 'https://deno.land/std/node/module.ts'
import PugLinter from 'pug-lint'

// HACK for 'dynamic require is not supported' error in 'linter.configure()'.
// @ts-expect-error Element implicitly has an 'any' type.
globalThis.require = createRequire(import.meta.url)

Deno.test({
  name: 'i18n tag validation',
  fn: async function (tests) {
    const linter = new PugLinter()

    linter.configure(
      {
        additionalRules: ['scripts/validate-i18n.js'],
        validateI18n: true
      }
    )

    const errorCode = 'PUG:LINT_VALIDATEI18N'

    function outdent (str: string) {
      const lines = str.slice(1).split('\n')
      const indent = (lines[0].match(/^\s*/) || [''])[0]

      if (indent === '') {
        return lines.join('\n')
      }
      return lines.map(
        line => line.startsWith(indent) ? line.slice(indent.length) : line
      ).join('\n')
    }

    await tests.step('should allow valid usage of a simple string', async function () {
      const validUseCase = 'i18n Hello world'

      assertEquals(linter.checkString(validUseCase).length, 0, validUseCase)
    })

    await tests.step('should allow valid usage of a string with named arguments', async function () {
      const validUseCase = outdent(
        String.raw`
        i18n(
          :args='{ name: ourUsername }'
        ) Hello {name}!`
      )

      assertEquals(linter.checkString(validUseCase).length, 0, validUseCase)
    })

    await tests.step('should allow valid usage of a string containing HTML markup', async function () {
      const validUseCase = outdent(
        String.raw`
        i18n(
          :args='{ ...LTags("strong", "span"), name: ourUsername }'
        ) Hello {strong_}{name}{_strong}, today it's a {span_}nice day{_span}!`
      )

      assertEquals(linter.checkString(validUseCase).length, 0, validUseCase)
    })

    await tests.step('should allow valid usage of a string containing Vue markup', async function () {
      const validUseCase = outdent(
        String.raw`
        i18n(
          compile
          :args='{ r1: \'<router-link class="link" to="/login">\', r2: "</router-link>"}'
        ) Go to {r1}login{r2} page.`
      )

      assertEquals(linter.checkString(validUseCase).length, 0, validUseCase)
    })

    // ====== Invalid usages ====== //

    await tests.step('should report syntax errors in the `:args` attribute', async function () {
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
      assertEquals(errors.length, 2)
      assertEquals(errors[0].code, errorCode)
      assertMatch(errors[0].message, /unexpected token/i)

      assertEquals(errors[1].code, errorCode)
      assertMatch(errors[1].message, /undefined named argument 'name'/i)

      // Example with a missing curly brace.
      invalidUseCase = outdent(
        String.raw`
        i18n(
          :args='{ name: ourUsername'
        ) Hello {name}!`
      )

      errors = linter.checkString(invalidUseCase)

      assertEquals(errors.length, 2)
      assertEquals(errors[0].code, errorCode)
      assertMatch(errors[0].message, /unexpected token/i)

      assertEquals(errors[1].code, errorCode)
      assertMatch(errors[1].message, /undefined named argument 'name'/i)

      // Example with an extraneous semicolon.
      invalidUseCase = outdent(
        String.raw`
        i18n(
          :args='{ name: ourUsername };'
        ) Hello {name}!`
      )

      errors = linter.checkString(invalidUseCase)
      assertEquals(errors.length, 1)

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

    await tests.step('should report undefined ltags', async function () {
      const invalidUseCase = outdent(
        String.raw`
        i18n(
          :args='{ count: 5 }'
        ) Invite {strong_}{count} members{_strong} to the party!`
      )
      const errors = linter.checkString(invalidUseCase)

      assertEquals(errors.length, 2)
      assertEquals(errors[0].code, errorCode)
      assertMatch(errors[0].message, /undefined named argument 'strong_'/i)
      assertEquals(errors[1].code, errorCode)
      assertMatch(errors[1].message, /undefined named argument '_strong'/i)
    })

    await tests.step('should report undefined named arguments', async function () {
      const invalidUseCase = outdent(
        String.raw`
        i18n(
          :args='{ ...LTags("strong") }'
        ) Invite {strong_}{count} members{_strong} to the party!`
      )
      const errors = linter.checkString(invalidUseCase)

      assertEquals(errors.length, 1)
      assertEquals(errors[0].code, errorCode)
      assertMatch(errors[0].message, /undefined named argument 'count'/i)
    })

    await tests.step('should report unused ltags', async function () {
      const invalidUseCase = outdent(
        String.raw`
        i18n(
          :args='{ ...LTags("strong") }'
        ) Invite your friends to the party!`
      )
      const errors = linter.checkString(invalidUseCase)

      assertEquals(errors.length, 2)
      assertEquals(errors[0].code, errorCode)
      assertMatch(errors[0].message, /unused named argument 'strong_'/i)
      assertEquals(errors[1].code, errorCode)
      assertMatch(errors[1].message, /unused named argument '_strong'/i)
    })

    await tests.step('should report unused named arguments', async function () {
      const invalidUseCase = outdent(
        String.raw`
        i18n(
          :args='{ age, name }'
        ) Hello {name}!`
      )
      const errors = linter.checkString(invalidUseCase)

      assertEquals(errors.length, 1)
      assertEquals(errors[0].code, errorCode)
      assertMatch(errors[0].message, /unused named argument 'age'/i)
    })

    await tests.step('should report usage of the `html` attribute', async function () {
      const invalidUseCase = outdent(
        String.raw`
        i18n(
          tag='p'
          html='My <b>great</b> text'
        ) Hello`
      )

      const errors = linter.checkString(invalidUseCase)
      assertEquals(errors.length, 1)
      assertEquals(errors[0].code, errorCode)
      assertMatch(errors[0].message, /html attribute/)
    })

    await tests.step('should report usage of double curly braces', async function () {
      const invalidUseCase = 'i18n Replying to {{replyingTo}}'
      const errors = linter.checkString(invalidUseCase)

      assertEquals(errors.length, 1)
      assertEquals(errors[0].code, errorCode)
      assertMatch(errors[0].message, /double curly braces/i)
    })
  }
})
