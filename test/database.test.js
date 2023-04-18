/* eslint-env mocha */
'use strict'

import assert from 'node:assert'
import { rm } from 'node:fs/promises'

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
  const {
    clear,
    exportToJSON,
    importFromJSON,
    initStorage,
    readData,
    writeData
  } = require(`~/backend/database-${lowerCaseName}.js`)

  describe(`Test ${name} storage API`, function () {
    before('storage backend initialization', async function () {
      await initStorage(options[lowerCaseName])
    })
    beforeEach('storage clear', async function () {
      await clear()
    })

    it('should throw if the key contains path components', async function () {
      const badKeys = [
        '/badkey', './badkey', '../badkey',
        'bad/key', 'bad/./key', 'bad/../key',
        'badkey/', 'badkey/.', 'badkey/..'
      ]
      const windowsBadKeys = badKeys.map(k => k.replace(/\//g, '\\'))
      badKeys.push(...windowsBadKeys)

      await Promise.all(badKeys.map(badKey => (
        assert.rejects(readData(badKey), isBadKeyError(badKey))
      )))
      await Promise.all(badKeys.map(badKey => (
        assert.rejects(writeData(badKey, ''), isBadKeyError(badKey))
      )))
    })

    it('should throw if the key contains any unprintable character', async function () {
      const unprintableCharacters = [...String.fromCharCode(...range(32), 127)]

      await Promise.all(unprintableCharacters.map(c => (
        assert.rejects(readData(c), err => err.message === `bad key: ${JSON.stringify(c)}`)
      )))
      await Promise.all(unprintableCharacters.map(c => (
        assert.rejects(writeData(c, ''), err => err.message === `bad key: ${JSON.stringify(c)}`)
      )))
    })

    it('Should return `undefined` if the key was not found', async function () {
      const actual = await readData('foo')
      const expected = undefined

      assert.equal(actual, expected)
    })

    it('Should return the string that has been written', async function () {
      await writeData('newKey', 'newValue')

      const actual = await readData('newKey')
      const expected = 'newValue'

      assert.equal(actual, expected)
    })

    it('Should return the buffer that has been written', async function () {
      const buffer = Buffer.from('contents')
      const key = 'blob=key'
      await writeData(key, buffer)

      const actual = await readData(key)
      const expected = buffer

      assert.equal(Buffer.compare(actual, expected), 0)
    })

    it('Should return the new buffer after an update', async function () {
      const oldBuffer = Buffer.from('someValue')
      const newBuffer = Buffer.from('someOtherValue')
      const key = 'blob=key'

      await writeData(key, oldBuffer)
      await writeData(key, newBuffer)

      const actual = await readData(key)
      const expected = newBuffer

      assert.equal(Buffer.compare(actual, expected), 0)
    })

    it('Should return the new string after an update', async function () {
      await writeData('someKey', 'someValue')
      await writeData('someKey', 'someOtherValue')

      const actual = await readData('someKey')
      const expected = 'someOtherValue'

      assert.strictEqual(actual, expected)
    })

    it('Should roundtrip entries in bulk given a JSON object', async function () {
      const json = Object.fromEntries(
        range(100).map(key => [key, String(Math.random())])
      )
      await importFromJSON(json)

      const actual = await exportToJSON()
      const expected = json

      assert.deepStrictEqual(actual, expected)
    })

    after('cleanup', async function () {
      await rm(options[lowerCaseName].dirname, { recursive: true })
    })
  })
})
