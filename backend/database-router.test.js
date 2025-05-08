import assert from 'node:assert'
import RouterBackend from './database-router.js'
import { cloneDeep, omit } from 'turtledash'
import { describe, it } from 'node:test'

const validConfig = {
  'abc': {
    name: 'sqlite',
    options: {
      dirname: './data'
    }
  },
  '*': {
    name: 'fs',
    options: {
      dirname: './data'
    }
  }
}

describe('DatabaseRouter::validateConfig', () => {
  const db = new RouterBackend()

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
