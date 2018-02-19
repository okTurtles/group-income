/* eslint-env mocha */

import sinon from 'sinon'
import { default as DATA } from './data'
import { default as EVENTS } from './events'
import sbp from '../sbp'

require('should-sinon')

describe('[SBP] EVENTS domain', () => {
  before(() => {
    // TODO move this to events to make dependency more explicit
    sbp.registerDomain('data', DATA)
  })
  it('should register event listener', () => {
    const testListener = sinon.spy()
    EVENTS['/on/v2']('testEvent', testListener)
    EVENTS['/emit/v2']('testEvent')
    EVENTS['/emit/v2']('testEvent')
    testListener.should.be.calledTwice()
  })
  it('should pass event listener the right data', () => {
    const testListener = sinon.spy()
    const testData = 1
    EVENTS['/on/v2']('testEvent', testListener)
    EVENTS['/emit/v2']('testEvent', testData)
    testListener.should.be.calledWith({event: 'testEvent', data: testData})
  })
  it('should call "once" listener once', () => {
    const testListener = sinon.spy()
    EVENTS['/once/v2']('testEvent', testListener)
    EVENTS['/emit/v2']('testEvent')
    EVENTS['/emit/v2']('testEvent')
    testListener.should.be.calledOnce()
  })
})
