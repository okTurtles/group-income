/* eslint-env mocha */

import should from 'should'
import sinon from 'sinon'
import { default as LODASH } from '../lodash'
import { default as DATA } from './index.js'
import sbp from '../../../sbp'

require('should-sinon')

describe('[SBP] DATA domain', () => {
  before(() => {
    // TODO move this to data to make dependency more explicit
    sbp.registerDomain('okTurtles.lodash', LODASH)
  })

  it('should store simple value', () => {
    DATA['/set']('test', 1)
    should(DATA['/get']('test')).equal(1)
  })

  it('should store simple value in deeper path', () => {
    DATA['/set']('test/deep', 1)
    should(DATA['/get']('test/deep')).equal(1)
  })

  it('should reset value', () => {
    DATA['/set']('test/reset', 1)
    DATA['/set']('test/reset', 2)
    should(DATA['/get']('test/reset')).equal(2)
  })

  it('should add item to collection', () => {
    DATA['/add']('testCollection', 1)
    DATA['/add']('testCollection', 2)
    should(DATA['/get']('testCollection')).deepEqual([1, 2])
  })

  it('should return undefined for unset path', () => {
    should(DATA['/get']('testNothing')).deepEqual(undefined)
  })

  it('should add fn to collection', () => {
    const testFn = sinon.spy()
    DATA['/add']('fnTestCollection', 1)
    DATA['/add']('fnTestCollection', testFn)
    DATA['/get']('fnTestCollection')[1]()
    testFn.should.be.called()
  })
})
