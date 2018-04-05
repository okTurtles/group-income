/* eslint-env mocha */

import sinon from 'sinon'
import { default as DATA } from '../data'
import { default as EVENTS } from './index.js'
import sbp from '../../../sbp'

require('should-sinon')

describe('[SBP] EVENTS domain', () => {
  before(() => {
    // TODO move this to events to make dependency more explicit
    sbp.registerDomain('okTurtles.data', DATA)
  })
  it('should register event listener', () => {
    const testListener = sinon.spy()
    EVENTS['/on']('testEvent', testListener)
    EVENTS['/emit']('testEvent')
    EVENTS['/emit']('testEvent')
    testListener.should.be.calledTwice()
  })
  it('should pass event listener the right data', () => {
    const testListener = sinon.spy()
    const testData = 1
    EVENTS['/on']('testEvent', testListener)
    EVENTS['/emit']('testEvent', testData)
    testListener.should.be.calledWith({event: 'testEvent', data: testData})
  })
  it('should call "once" listener once', () => {
    const testListener = sinon.spy()
    EVENTS['/once']('testEvent', testListener)
    EVENTS['/emit']('testEvent')
    EVENTS['/emit']('testEvent')
    testListener.should.be.calledOnce()
  })
})
