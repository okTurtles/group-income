/* eslint-env mocha */

import should from 'should'
import { default as LODASH } from './index.js'

describe('[SBP] LODASH domain', () => {
  it('should store simple value', () => {
    let testMap = new Map()
    LODASH['/set'](testMap, 'test', 1)
    should(LODASH['/get'](testMap, 'test')).equal(1)
  })

  it('should store simple value in deeper path', () => {
    let testMap = new Map()
    LODASH['/set'](testMap, 'test/deep', 1)
    should(LODASH['/get'](testMap, 'test/deep')).equal(1)
  })

  it('should reset value', () => {
    let testMap = new Map()
    LODASH['/set'](testMap, 'test/reset', 1)
    LODASH['/set'](testMap, 'test/reset', 2)
    should(LODASH['/get'](testMap, 'test/reset')).equal(2)
  })

  it('should return undefined for unset path', () => {
    let testMap = new Map()
    should(LODASH['/get'](testMap, 'testNothing')).deepEqual(undefined)
  })

  it('should return undefined for unset map', () => {
    should(LODASH['/get'](undefined, 'testNothing')).deepEqual(undefined)
  })
})
