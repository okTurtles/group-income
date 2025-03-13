/* eslint-env mocha */
'use strict'

import assert from 'node:assert'
import { rm } from 'node:fs/promises'
import { checkKey } from '~/shared/domains/chelonia/db.js'

const names = ['FS', 'SQLite']
const options = {
  fs: {
    dirname: './test/data/fs'
  },
  sqlite: {
    dirname: './test/data/sqlite',
    filename: 'groupincome.db'
  }
}

const isBadKeyError = badKey => err => err.message === `bad key: ${JSON.stringify(badKey)}`

const range = (n) => [...new Array(n).keys()]

names.forEach((name) => {
  const lowerCaseName = name.toLowerCase()
  const Ctor = require(`~/backend/database-${lowerCaseName}.js`).default
  const db = new Ctor(options[lowerCaseName])

  describe(`Test ${name} storage API`, function () {
    before('storage backend initialization', async function () {
      await db.init()
    })
    beforeEach('storage clear', async function () {
      await db.clear()
    })

    it('should throw if the key contains a path component', function () {
      const badKeys = [
        '/badkey', './badkey', '../badkey',
        'bad/key', 'bad/./key', 'bad/../key',
        'badkey/', 'badkey/.', 'badkey/..'
      ]
      const windowsBadKeys = badKeys.map(k => k.replace(/\//g, '\\'))
      badKeys.push(...windowsBadKeys)

      badKeys.map(badKey => (
        assert.throws(() => checkKey(badKey), isBadKeyError(badKey))
      ))
    })

    it('should throw if the key contains an unprintable character', function () {
      const unprintableCharacters = [...String.fromCharCode(...range(32), 127)]

      unprintableCharacters.map(c => (
        assert.throws(() => checkKey(c), err => err.message === `bad key: ${JSON.stringify(c)}`)
      ))
    })

    it('Should return `undefined` if the key was not found', async function () {
      const actual = await db.readData('foo')
      const expected = undefined

      assert.equal(actual, expected)
    })

    it('Should return the string that has been written', async function () {
      await db.writeData('newKey', 'newValue')

      const actual = await db.readData('newKey').then(data => Buffer.isBuffer(data) ? data.toString('utf8') : data)
      const expected = 'newValue'

      assert.equal(actual, expected)
    })

    it('Should return the buffer that has been written', async function () {
      const buffer = Buffer.from('contents')
      const key = 'blobkey'
      await db.writeData(key, buffer)

      const actual = await db.readData(key)
      const expected = buffer

      assert.equal(Buffer.compare(actual, expected), 0)
    })

    it('Should return the new buffer after an update', async function () {
      const oldBuffer = Buffer.from('someValue')
      const newBuffer = Buffer.from('someOtherValue')
      const key = 'blobkey'

      await db.writeData(key, oldBuffer)
      await db.writeData(key, newBuffer)

      const actual = await db.readData(key)
      const expected = newBuffer

      assert.equal(Buffer.compare(actual, expected), 0)
    })

    it('Should return the new string after an update', async function () {
      await db.writeData('someKey', 'someValue')
      await db.writeData('someKey', 'someOtherValue')

      const actual = await db.readData('someKey').then(data => Buffer.isBuffer(data) ? data.toString('utf8') : data)
      const expected = 'someOtherValue'

      assert.strictEqual(actual, expected)
    })

    after('cleanup', async function () {
      await rm(options[lowerCaseName].dirname, { recursive: true })
    })
  })
})
