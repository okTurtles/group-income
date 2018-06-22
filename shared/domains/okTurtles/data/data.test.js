/* eslint-env mocha */

import should from 'should'
import sinon from 'sinon'
import sbp from '../../../sbp.js'
import './index.js'

require('should-sinon')

describe('[SBP] DATA domain', () => {
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
    sbp('okTurtles.data/pushValue', 'testCollection', 1)
    sbp('okTurtles.data/pushValue', 'testCollection', 2)
    should(sbp('okTurtles.data/get', 'testCollection')).deepEqual([1, 2])
  })

  it('should return undefined for unset path', () => {
    should(sbp('okTurtles.data/get', 'testNothing')).deepEqual(undefined)
    sbp('okTurtles.data/delete', 'testCollection')
    should(sbp('okTurtles.data/get', 'testCollection')).deepEqual(undefined)
  })

  it('should add and remove fn from collection', () => {
    const testFn = sinon.spy()
    sbp('okTurtles.data/pushValue', 'fnTestCollection', 1)
    sbp('okTurtles.data/pushValue', 'fnTestCollection', testFn)
    sbp('okTurtles.data/get', 'fnTestCollection')[1]()
    testFn.should.be.called()
    sbp('okTurtles.data/popValue', 'fnTestCollection', testFn)
    should(sbp('okTurtles.data/get', 'fnTestCollection').length).equal(1)
  })
})
