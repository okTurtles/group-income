// Can run directly with:
// deno test --import-map=import-map.json frontend/common/stringTemplate.test.ts

import { assertEquals } from 'asserts'

import template from './stringTemplate.js'

Deno.test('Test string-template', async function (tests) {
  await tests.step('Named arguments are replaced', async function () {
    const result = template('Hello {name}, how are you?', { name: 'Mark' })
    assertEquals(result, 'Hello Mark, how are you?')
  })
  await tests.step('Named arguments at the start of strings are replaced', async function () {
    const result = template('{likes} people have liked this', { likes: 123 })
    assertEquals(result, '123 people have liked this')
  })
  await tests.step('Named arguments at the end of string are replaced', async function () {
    const result = template('Please respond by {date}', { date: '01/01/2015' })
    assertEquals(result, result, 'Please respond by 01/01/2015')
  })
  await tests.step('Multiple named arguments are replaced', async function () {
    const result = template('Hello {name}, you have {emails} new messages', { name: 'Anna', emails: 5 })
    assertEquals(result, 'Hello Anna, you have 5 new messages')
  })
  await tests.step('Missing named arguments become 0 characters', async function () {
    const result = template('Hello{name}, how are you?', {})
    assertEquals(result, 'Hello, how are you?')
  })
  await tests.step('Named arguments can be escaped', async function () {
    const result = template('Hello {{name}}, how are you?', { name: 'Mark' })
    assertEquals(result, 'Hello {name}, how are you?')
  })
  await tests.step('Array arguments are replaced', async function () {
    const result = template('Hello {0}, how are you?', ['Mark'])
    assertEquals(result, 'Hello Mark, how are you?')
  })
  await tests.step('Array arguments at the start of strings are replaced', async function () {
    const result = template('{0} people have liked this', [123])
    assertEquals(result, '123 people have liked this')
  })
  await tests.step('Array arguments at the end of string are replaced', async function () {
    const result = template('Please respond by {0}', ['01/01/2015'])
    assertEquals(result, 'Please respond by 01/01/2015')
  })
  await tests.step('Multiple array arguments are replaced', async function () {
    const result = template('Hello {0}, you have {1} new messages', ['Anna', 5])
    assertEquals(result, 'Hello Anna, you have 5 new messages')
  })
  await tests.step('Missing array arguments become 0 characters', async function () {
    const result = template('Hello{0}, how are you?', [])
    assertEquals(result, 'Hello, how are you?')
  })
  await tests.step('Array arguments can be escaped', async function () {
    const result = template('Hello {{0}}, how are you?', ['Mark'])
    assertEquals(result, 'Hello {0}, how are you?')
  })
  await tests.step('Array keys are not accessible', async function () {
    const result = template('Function{splice}', [])
    assertEquals(result, 'Function')
  })
  await tests.step('Listed arguments are replaced', async function () {
    const result = template('Hello {0}, how are you?', 'Mark')
    assertEquals(result, 'Hello Mark, how are you?')
  })
  await tests.step('Listed arguments at the start of strings are replaced', async function () {
    const result = template('{0} people have liked this', 123)
    assertEquals(result, '123 people have liked this')
  })
  await tests.step('Listed arguments at the end of string are replaced', async function () {
    const result = template('Please respond by {0}', '01/01/2015')
    assertEquals(result, 'Please respond by 01/01/2015')
  })
  await tests.step('Multiple listed arguments are replaced', async function () {
    const result = template('Hello {0}, you have {1} new messages', 'Anna', 5)
    assertEquals(result, 'Hello Anna, you have 5 new messages')
  })
  await tests.step('Missing listed arguments become 0 characters', async function () {
    const result = template('Hello{1}, how are you?', 'no')
    assertEquals(result, 'Hello, how are you?')
  })
  await tests.step('Listed arguments can be escaped', async function () {
    const result = template('Hello {{0}}, how are you?', 'Mark')
    assertEquals(result, 'Hello {0}, how are you?')
  })
  await tests.step('Allow null data', async function () {
    const result = template('Hello{0}', null)
    assertEquals(result, 'Hello')
  })
  await tests.step('Allow undefined data', async function () {
    const result1 = template('Hello{0}')
    const result2 = template('Hello{0}', undefined)
    assertEquals(result1, 'Hello')
    assertEquals(result2, 'Hello')
  })
  await tests.step('Null keys become 0 characters', async function () {
    const result1 = template('Hello{name}', { name: null })
    const result2 = template('Hello{0}', [null])
    const result3 = template('Hello{0}{1}{2}', null, null, null)
    assertEquals(result1, 'Hello')
    assertEquals(result2, 'Hello')
    assertEquals(result3, 'Hello')
  })
  await tests.step('Undefined keys become 0 characters', async function () {
    const result1 = template('Hello{firstName}{lastName}', { name: undefined })
    const result2 = template('Hello{0}{1}', [undefined])
    const result3 = template('Hello{0}{1}{2}', undefined, undefined)
    assertEquals(result1, result1, 'Hello')
    assertEquals(result2, result2, 'Hello')
    assertEquals(result3, result3, 'Hello')
  })
  await tests.step('Works across multline strings', async function () {
    const result1 = template('{zero}\n{one}\n{two}', {
      zero: 'A',
      one: 'B',
      two: 'C'
    })
    const result2 = template('{0}\n{1}\n{2}', ['A', 'B', 'C'])
    const result3 = template('{0}\n{1}\n{2}', 'A', 'B', 'C')
    assertEquals(result1, 'A\nB\nC')
    assertEquals(result2, 'A\nB\nC')
    assertEquals(result3, 'A\nB\nC')
  })
  await tests.step('Allow multiple references', async function () {
    const result1 = template('{a}{b}{c}\n{a}{b}{c}\n{a}{b}{c}', {
      a: 'one',
      b: 'two',
      c: 'three'
    })
    const result2 = template('{0}{1}{2}\n{0}{1}{2}\n{0}{1}{2}', [
      'one',
      'two',
      'three'
    ])
    const result3 = template('{0}{1}{2}\n{0}{1}{2}\n{0}{1}{2}',
      'one',
      'two',
      'three')
    assertEquals(result1, 'onetwothree\nonetwothree\nonetwothree')
    assertEquals(result2, 'onetwothree\nonetwothree\nonetwothree')
    assertEquals(result3, 'onetwothree\nonetwothree\nonetwothree')
  })
  await tests.step('Template string without arguments', async function () {
    const result = template('Hello, how are you?')
    assertEquals(result, 'Hello, how are you?')
  })
  await tests.step('Template string with underscores', async function () {
    const result = template('Hello {FULL_NAME}, how are you?', { FULL_NAME: 'James Bond' })
    assertEquals(result, 'Hello James Bond, how are you?')
  })
})
