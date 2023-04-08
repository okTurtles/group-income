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

names.forEach((name) => {
  const lowerCaseName = name.toLowerCase()
  const {
    initStorage,
    readString,
    writeString
  } = require(`~/backend/database-${lowerCaseName}.js`)

  describe(`Test ${name} storage API`, function () {
    before('storage backend initialization', async function () {
      await initStorage(options[lowerCaseName])
    })

    it('Should throw if the key is invalid', async function () {
      const badKeys = ['../bad/key', '..\\bad\\key', 'bad/key', 'bad\\key']

      await Promise.all(badKeys.map(badKey => (
        assert.rejects(readString(badKey), err => err.message === `bad name: ${badKey}`)
      )))
    })

    it('Should return `undefined` if the key was not found', async function () {
      const actual = await readString('foo')
      const expected = undefined

      assert.equal(actual, expected)
    })

    it('Should return the value that has been written', async function () {
      await writeString('newKey', 'newValue')

      const actual = await readString('newKey')
      const expected = 'newValue'

      assert.equal(actual, expected)
    })

    it('Should return the new value after an update', async function () {
      await writeString('someKey', 'someValue')
      await writeString('someKey', 'someOtherValue')

      const actual = await readString('someKey')
      const expected = 'someOtherValue'

      assert.equal(actual, expected)
    })

    after('cleanup', async function () {
      await rm(options[lowerCaseName].dirname, { recursive: true })
    })
  })
})
