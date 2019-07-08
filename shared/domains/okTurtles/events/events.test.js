/* eslint-env mocha */

import sinon from 'sinon'
import sbp from '~/shared/sbp.js'
import '../data/index.js'
import './index.js'

require('should-sinon')

describe('[SBP] EVENTS domain', () => {
  it('should register event listener', () => {
    const testListener = sinon.spy()
    sbp('okTurtles.events/on', 'testEvent', testListener)
    sbp('okTurtles.events/emit', 'testEvent')
    sbp('okTurtles.events/emit', 'testEvent')
    testListener.should.be.calledTwice()
  })
  it('should pass event listener the right data', () => {
    const testListener = sinon.spy()
    const testData = 1
    sbp('okTurtles.events/on', 'testEvent', testListener)
    sbp('okTurtles.events/emit', 'testEvent', testData)
    testListener.should.be.calledWith(testData)
  })
  it('should call "once" listener once', () => {
    const testListener = sinon.spy()
    sbp('okTurtles.events/once', 'testEvent', testListener)
    sbp('okTurtles.events/emit', 'testEvent')
    sbp('okTurtles.events/emit', 'testEvent')
    testListener.should.be.calledOnce()
  })
  it('should disable listener correctly', () => {
    const testListener = sinon.spy()
    sbp('okTurtles.events/on', 'testEvent2', testListener)
    sbp('okTurtles.events/emit', 'testEvent2')
    sbp('okTurtles.events/off', 'testEvent2')
    sbp('okTurtles.events/emit', 'testEvent2')
    testListener.should.be.calledOnce()
  })
})
