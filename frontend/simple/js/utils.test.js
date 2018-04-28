/* eslint-env mocha */

import should from 'should'
import { deepGet, deepSet } from './utils.js'

describe('map utils', () => {
  it('should store simple value', () => {
    let testMap = new Map()
    deepSet(testMap, 'test', 1)
    should(deepGet(testMap, 'test')).equal(1)
  })

  it('should store simple value in deeper path', () => {
    let testMap = new Map()
    deepSet(testMap, 'test/deep', 1)
    should(deepGet(testMap, 'test/deep')).equal(1)
  })

  it('should reset value', () => {
    let testMap = new Map()
    deepSet(testMap, 'test/reset', 1)
    deepSet(testMap, 'test/reset', 2)
    should(deepGet(testMap, 'test/reset')).equal(2)
  })

  it('should return undefined for unset path', () => {
    let testMap = new Map()
    should(deepGet(testMap, 'testNothing')).deepEqual(undefined)
  })

  it('should return undefined for unset map', () => {
    should(deepGet(undefined, 'testNothing')).deepEqual(undefined)
  })
})
