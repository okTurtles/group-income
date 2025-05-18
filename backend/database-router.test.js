/* eslint-env mocha */
import assert from 'node:assert'
import crypto from 'node:crypto'
import RouterBackend from './database-router.js'
import { cloneDeep, omit } from 'turtledash'

// CID for shelter-contract-text.
const CID = '\x51\x1e\x01'

const randomKeyWithPrefix = (prefix) => `${prefix}${crypto.randomUUID().replaceAll('-', '')}`

const validConfig = {
  [CID]: {
    name: 'sqlite',
    options: {
      filepath: './test/temp/sqlite.db'
    }
  },
  '*': {
    name: 'fs',
    options: {
      dirname: './test/temp'
    }
  }
}

const db = new RouterBackend({ config: validConfig })

describe('DatabaseRouter::validateConfig', () => {
  it('should accept a valid config', () => {
    const errors = db.validateConfig(validConfig)
    assert.equal(errors.length, 0)
  })

  it('should reject configs missing a * key', () => {
    const config = omit(validConfig, '*')
    const errors = db.validateConfig(config)
    assert.equal(errors.length, 1)
  })

  it('should reject config entries missing a name', () => {
    const config = cloneDeep(validConfig)
    delete config['*'].name
    const errors = db.validateConfig(config)
    assert.equal(errors.length, 1)
  })
})

describe('DatabaseRouter::lookupBackend', () => {
  before('initialization', async function () {
    await db.init()
  })
  after('temp storage clear', async function () {
    await db.clear()
  })

  it('should find the right backend for keys starting with configured prefixes', () => {
    for (const keyPrefix of Object.keys(db.config)) {
      if (keyPrefix === '*') continue
      const key = randomKeyWithPrefix(keyPrefix)

      const actual = db.lookupBackend(key)
      const expected = db.backends[keyPrefix]
      assert.equal(actual, expected)
    }
  })

  it('should find the right backend for keys equal to configured prefixes', () => {
    for (const keyPrefix of Object.keys(db.config)) {
      const key = keyPrefix

      const actual = db.lookupBackend(key)
      const expected = db.backends[keyPrefix]
      assert.equal(actual, expected)
    }
  })

  it('should return the fallback backend for keys not matching any configured prefix', () => {
    const key = 'foo'

    const actual = db.lookupBackend(key)
    const expected = db.backends['*']
    assert.equal(actual, expected)
  })
})
