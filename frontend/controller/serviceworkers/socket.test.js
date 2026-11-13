/* eslint-env mocha */
import assert from 'node:assert/strict'
import { isSocketOpen } from './socket.js'

describe('isSocketOpen', () => {
  it('is false without a socket', () => {
    assert.equal(isSocketOpen(null), false)
    assert.equal(isSocketOpen(undefined), false)
  })

  it('is true for an open socket', () => {
    assert.equal(isSocketOpen({ OPEN: 1, readyState: 1 }), true)
  })

  it('is true for readyState 1 when the socket has no OPEN constant', () => {
    assert.equal(isSocketOpen({ readyState: 1 }), true)
  })

  it('is false for a socket that is not open', () => {
    assert.equal(isSocketOpen({ OPEN: 1, readyState: 0 }), false)
    assert.equal(isSocketOpen({ OPEN: 1, readyState: 2 }), false)
    assert.equal(isSocketOpen({ OPEN: 1, readyState: 3 }), false)
  })
})
