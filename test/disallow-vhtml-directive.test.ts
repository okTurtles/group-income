import { assertEquals } from 'asserts'

import { createRequire } from 'https://deno.land/std/node/module.ts'
import PugLinter from 'pug-lint'

// HACK for 'dynamic require is not supported' error in 'linter.configure()'.
// @ts-expect-error Element implicitly has an 'any' type
globalThis.require = createRequire(import.meta.url)

Deno.test({
  name: 'Tests for the disallow-vhtml-directive linter rule',
  fn: async function (tests) {
    const errorCode = 'PUG:LINT_DISALLOWVHTMLDIRECTIVE'
    const linter = new PugLinter()

    linter.configure(
      {
        additionalRules: ['scripts/disallow-vhtml-directive.js'],
        disallowVHTMLDirective: true
      }
    )
    const outdent = (str: string) => {
      const lines = str.slice(1).split('\n')
      const indent = (lines[0].match(/^\s*/) || [''])[0]

      if (indent === '') {
        return lines.join('\n')
      }
      return lines.map(
        (line: string) => line.startsWith(indent) ? line.slice(indent.length) : line
      ).join('\n')
    }

    await tests.step('should allow usage of the `v-safe-html` directive', async function () {
      const validUseCase = outdent(
        String.raw`
        p.p-description
          span.has-text-1(v-safe-html='introTitle')`
      )

      assertEquals(linter.checkString(validUseCase).length, 0, validUseCase)
    })

    await tests.step('should disallow any usage of the `v-html` directive', async function () {
      const invalidUseCase = outdent(
        String.raw`
        p.p-description
          span.has-text-1(v-html='introTitle')`
      )
      const errors = linter.checkString(invalidUseCase)
      assertEquals(errors.length, 1)
      assertEquals(errors[0].code, errorCode)
    })
  }
})
