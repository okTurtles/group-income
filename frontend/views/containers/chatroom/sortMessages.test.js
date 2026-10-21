/* eslint-env mocha */
import assert from 'node:assert/strict'
import { isUnsentMessage, sortMessages } from './sortMessages.ts'

const msg = (id, height, extra = {}) => ({ hash: id, height, ...extra })
const ids = (messages) => messages.map(m => m.hash)

describe('sortMessages', () => {
  it('returns an empty array for no messages', () => {
    assert.deepEqual(sortMessages([]), [])
  })

  it('keeps already ordered messages in the same order without mutating the input', () => {
    const messages = [msg('a', 1), msg('b', 2), msg('c', 3, { pending: true })]
    const copy = [...messages]
    const sorted = sortMessages(messages)
    assert.deepEqual(ids(sorted), ['a', 'b', 'c'])
    assert.notEqual(sorted, messages)
    assert.deepEqual(messages, copy)
    sorted.forEach((m, i) => assert.equal(m, messages[i]))
  })

  it('sorts confirmed messages by height', () => {
    assert.deepEqual(ids(sortMessages([msg('c', 7), msg('a', 2), msg('b', 5)])), ['a', 'b', 'c'])
  })

  it('keeps the relative order of messages with the same height', () => {
    const messages = [msg('x', 4), msg('a', 2), msg('b', 2), msg('c', 2), msg('y', 1)]
    assert.deepEqual(ids(sortMessages(messages)), ['y', 'a', 'b', 'c', 'x'])
  })

  it('places pending and failed messages at the bottom in the order they were sent', () => {
    const messages = [
      msg('a', 1),
      msg('p1', 2, { pending: true }),
      msg('f1', 3, { pending: true, hasFailed: true }),
      msg('b', 5),
      msg('p2', 4, { pending: true }),
      msg('c', 6)
    ]
    assert.deepEqual(ids(sortMessages(messages)), ['a', 'b', 'c', 'p1', 'f1', 'p2'])
  })

  it('keeps a failed message at the bottom even if it is no longer pending', () => {
    const messages = [msg('a', 1), msg('f', 2, { hasFailed: true }), msg('b', 3)]
    assert.deepEqual(ids(sortMessages(messages)), ['a', 'b', 'f'])
  })

  it('keeps chain order when a message is received while ours is being sent (#3132)', () => {
    const ours = msg('ours', 10, { pending: true })
    let messages = sortMessages([msg('a', 8), msg('b', 9), ours])
    assert.deepEqual(ids(messages), ['a', 'b', 'ours'])

    messages = sortMessages([...messages, msg('theirs', 10)])
    assert.deepEqual(ids(messages), ['a', 'b', 'theirs', 'ours'])

    ours.hash = 'ours-retry'
    ours.height = 11
    assert.deepEqual(ids(messages), ['a', 'b', 'theirs', 'ours-retry'])
    messages = sortMessages(messages)
    assert.deepEqual(ids(messages), ['a', 'b', 'theirs', 'ours-retry'])

    delete ours.pending
    messages = sortMessages(messages)
    assert.deepEqual(ids(messages), ['a', 'b', 'theirs', 'ours-retry'])
  })

  it('moves a confirmed message that was processed out of order to its chain position', () => {
    const messages = [msg('a', 9), msg('ours', 11), msg('theirs', 10)]
    assert.deepEqual(ids(sortMessages(messages)), ['a', 'theirs', 'ours'])
  })

  it('places messages without a numeric height after the others, keeping their relative order', () => {
    const messages = [msg('x', undefined), msg('c', 3), msg('y', null), msg('a', 1), msg('z', NaN), msg('b', 2)]
    assert.deepEqual(ids(sortMessages(messages)), ['a', 'b', 'c', 'x', 'y', 'z'])
  })
})

describe('isUnsentMessage', () => {
  it('is true for pending and failed messages', () => {
    assert.equal(isUnsentMessage(msg('p', 1, { pending: true })), true)
    assert.equal(isUnsentMessage(msg('f', 1, { pending: true, hasFailed: true })), true)
    assert.equal(isUnsentMessage(msg('g', 1, { hasFailed: true })), true)
  })

  it('is false for confirmed messages', () => {
    assert.equal(isUnsentMessage(msg('a', 1)), false)
  })
})
