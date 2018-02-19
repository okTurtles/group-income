/* eslint-env mocha */

import should from 'should'
import sinon from 'sinon'
import { default as DATA } from './data'

require('should-sinon')

describe('[SBP] DATA domain', () => {
  it('should store simple value', () => {
    DATA['/set/v1']('test', 1)
    should(DATA['/get/v1']('test')).equal(1)
  })

  it('should store simple value in deeper path', () => {
    DATA['/set/v1']('test/deep', 1)
    should(DATA['/get/v1']('test/deep')).equal(1)
  })

  it('should reset value', () => {
    DATA['/set/v1']('test/reset', 1)
    DATA['/set/v1']('test/reset', 2)
    should(DATA['/get/v1']('test/reset')).equal(2)
  })

  it('should add item to collection', () => {
    DATA['/add/v1']('testCollection', 1)
    DATA['/add/v1']('testCollection', 2)
    should(DATA['/get/v1']('testCollection')).deepEqual([1, 2])
  })

  it('should return empty list for unset path', () => {
    should(DATA['/get/v1']('testNothing')).deepEqual([])
  })

  it('should add fn to collection', () => {
    const testFn = sinon.spy()
    DATA['/add/v1']('fnTestCollection', 1)
    DATA['/add/v1']('fnTestCollection', testFn)
    DATA['/get/v1']('fnTestCollection')[1]()
    testFn.should.be.called()
  })
})
