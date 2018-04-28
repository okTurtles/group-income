/* eslint-env mocha */

import should from 'should'
import sinon from 'sinon'
import { default as DATA } from './index.js'
import sbp from '../../../sbp'

require('should-sinon')

describe('[SBP] DATA domain', () => {
  before(() => {
    sbp.registerDomain('okTurtles.data', DATA)
  })
  after(() => {
    sbp.unregisterDomain('okTurtles.data')
  })

  it('should store simple value', () => {
    sbp('okTurtles.data/set', 'test', 1)
    should(sbp('okTurtles.data/get', 'test')).equal(1)
  })

  it('should reset value', () => {
    sbp('okTurtles.data/set', 'reset', 1)
    sbp('okTurtles.data/set', 'reset', 2)
    should(sbp('okTurtles.data/get', 'reset')).equal(2)
  })

  it('should add item to collection', () => {
    sbp('okTurtles.data/add', 'testCollection', 1)
    sbp('okTurtles.data/add', 'testCollection', 2)
    should(sbp('okTurtles.data/get', 'testCollection')).deepEqual([1, 2])
  })

  it('should return undefined for unset path', () => {
    should(sbp('okTurtles.data/get', 'testNothing')).deepEqual(undefined)
  })

  it('should add fn to collection', () => {
    const testFn = sinon.spy()
    sbp('okTurtles.data/add', 'fnTestCollection', 1)
    sbp('okTurtles.data/add', 'fnTestCollection', testFn)
    sbp('okTurtles.data/get', 'fnTestCollection')[1]()
    testFn.should.be.called()
  })
})
