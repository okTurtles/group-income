/* eslint-env mocha */
import template from './string-template.js'
const should = require('should')
describe('Test String', function () {
  it('Named arguments are replaced', function () {
    let result = template('Hello {name}, how are you?', { name: 'Mark' })
    should(result).equal('Hello Mark, how are you?')
  })
  it('Named arguments at the start of strings are replaced', function () {
    let result = template('{likes} people have liked this', { likes: 123 })
    should(result).equal('123 people have liked this')
  })
  it('Named arguments at the end of string are replaced', function () {
    let result = template('Please respond by {date}', { date: '01/01/2015' })
    should(result).equal(result, 'Please respond by 01/01/2015')
  })
  it('Multiple named arguments are replaced', function () {
    let result = template('Hello {name}, you have {emails} new messages', { name: 'Anna', emails: 5 })
    should(result).equal('Hello Anna, you have 5 new messages')
  })
  it('Missing named arguments become 0 characters', function () {
    let result = template('Hello{name}, how are you?', {})
    should(result).equal('Hello, how are you?')
  })
  it('Named arguments can be escaped', function () {
    let result = template('Hello {{name}}, how are you?', { name: 'Mark' })
    should(result).equal('Hello {name}, how are you?')
  })
  it('Array arguments are replaced', function () {
    let result = template('Hello {0}, how are you?', ['Mark'])
    should(result).equal('Hello Mark, how are you?')
  })
  it('Array arguments at the start of strings are replaced', function () {
    let result = template('{0} people have liked this', [123])
    should(result).equal('123 people have liked this')
  })
  it('Array arguments at the end of string are replaced', function () {
    let result = template('Please respond by {0}', ['01/01/2015'])
    should(result).equal('Please respond by 01/01/2015')
  })
  it('Multiple array arguments are replaced', function () {
    let result = template('Hello {0}, you have {1} new messages', ['Anna', 5])
    should(result).equal('Hello Anna, you have 5 new messages')
  })
  it('Missing array arguments become 0 characters', function () {
    let result = template('Hello{0}, how are you?', [])
    should(result).equal('Hello, how are you?')
  })
  it('Array arguments can be escaped', function () {
    let result = template('Hello {{0}}, how are you?', ['Mark'])
    should(result).equal('Hello {0}, how are you?')
  })
  it('Array keys are not accessible', function () {
    let result = template('Function{splice}', [])
    should(result).equal('Function')
  })
  it('Listed arguments are replaced', function () {
    let result = template('Hello {0}, how are you?', 'Mark')
    should(result).equal('Hello Mark, how are you?')
  })
  it('Listed arguments at the start of strings are replaced', function () {
    let result = template('{0} people have liked this', 123)
    should(result).equal('123 people have liked this')
  })
  it('Listed arguments at the end of string are replaced', function () {
    let result = template('Please respond by {0}', '01/01/2015')
    should(result).equal('Please respond by 01/01/2015')
  })
  it('Multiple listed arguments are replaced', function () {
    let result = template('Hello {0}, you have {1} new messages', 'Anna', 5)
    should(result).equal('Hello Anna, you have 5 new messages')
  })
  it('Missing listed arguments become 0 characters', function () {
    let result = template('Hello{1}, how are you?', 'no')
    should(result).equal('Hello, how are you?')
  })
  it('Listed arguments can be escaped', function () {
    let result = template('Hello {{0}}, how are you?', 'Mark')
    should(result).equal('Hello {0}, how are you?')
  })
  it('Allow null data', function () {
    let result = template('Hello{0}', null)
    should(result).equal('Hello')
  })
  it('Allow undefined data', function () {
    let result1 = template('Hello{0}')
    let result2 = template('Hello{0}', undefined)
    should(result1).equal('Hello')
    should(result2).equal('Hello')
  })
  it('Null keys become 0 characters', function () {
    let result1 = template('Hello{name}', { name: null })
    let result2 = template('Hello{0}', [null])
    let result3 = template('Hello{0}{1}{2}', null, null, null)
    should(result1).equal('Hello')
    should(result2).equal('Hello')
    should(result3).equal('Hello')
  })
  it('Undefined keys become 0 characters', function () {
    let result1 = template('Hello{firstName}{lastName}', { name: undefined })
    let result2 = template('Hello{0}{1}', [undefined])
    let result3 = template('Hello{0}{1}{2}', undefined, undefined)
    should(result1).equal(result1, 'Hello')
    should(result2).equal(result2, 'Hello')
    should(result3).equal(result3, 'Hello')
  })
  it('Works across multline strings', function () {
    let result1 = template('{zero}\n{one}\n{two}', {
      zero: 'A',
      one: 'B',
      two: 'C'
    })
    let result2 = template('{0}\n{1}\n{2}', ['A', 'B', 'C'])
    let result3 = template('{0}\n{1}\n{2}', 'A', 'B', 'C')
    should(result1).equal('A\nB\nC')
    should(result2).equal('A\nB\nC')
    should(result3).equal('A\nB\nC')
  })
  it('Allow multiple references', function () {
    let result1 = template('{a}{b}{c}\n{a}{b}{c}\n{a}{b}{c}', {
      a: 'one',
      b: 'two',
      c: 'three'
    })
    let result2 = template('{0}{1}{2}\n{0}{1}{2}\n{0}{1}{2}', [
      'one',
      'two',
      'three'
    ])
    let result3 = template('{0}{1}{2}\n{0}{1}{2}\n{0}{1}{2}',
      'one',
      'two',
      'three')
    should(result1).equal('onetwothree\nonetwothree\nonetwothree')
    should(result2).equal('onetwothree\nonetwothree\nonetwothree')
    should(result3).equal('onetwothree\nonetwothree\nonetwothree')
  })
  it('Template string without arguments', function () {
    let result = template('Hello, how are you?')
    should(result).equal('Hello, how are you?')
  })
  it('Template string with underscores', function () {
    let result = template('Hello {FULL_NAME}, how are you?', { FULL_NAME: 'James Bond' })
    should(result).equal('Hello James Bond, how are you?')
  })
})
