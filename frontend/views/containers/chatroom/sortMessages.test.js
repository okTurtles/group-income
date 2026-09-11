/* eslint-env mocha */
import { sortMessages, resolveFailedMessage } from './sortMessages.js'
const should = require('should')

const msg = (hash, height, extra = {}) => ({ hash, height, ...extra })

describe('sortMessages', function () {
  it('orders messages by height', function () {
    const a = msg('a', 3)
    const b = msg('b', 1)
    const c = msg('c', 2)
    should(sortMessages([a, b, c])).eql([b, c, a])
  })

  it('keeps the source order for messages with the same height', function () {
    const a = msg('a', 5)
    const b = msg('b', 5)
    const c = msg('c', 4)
    const d = msg('d', 5)
    should(sortMessages([a, b, c, d])).eql([c, a, b, d])
  })

  it('sorts temporary messages (MAX_SAFE_INTEGER height) last', function () {
    const temporary = msg('t', Number.MAX_SAFE_INTEGER, { pending: true })
    const a = msg('a', 2)
    const b = msg('b', 9)
    should(sortMessages([temporary, a, b])).eql([a, b, temporary])
  })

  it('sorts messages with a missing height last', function () {
    const pending = msg('p', undefined, { pending: true })
    const a = msg('a', 1)
    should(sortMessages([pending, a])).eql([a, pending])
  })

  it('treats a null height the same as a missing one', function () {
    const pending = msg('p', null, { pending: true })
    const a = msg('a', 1)
    should(sortMessages([pending, a])).eql([a, pending])
  })

  it('keeps several height-less messages in source order', function () {
    const first = msg('f', undefined)
    const second = msg('s', null)
    should(sortMessages([first, second])).eql([first, second])
  })

  it('does not mutate the source array', function () {
    const a = msg('a', 2)
    const b = msg('b', 1)
    const source = [a, b]
    const sorted = sortMessages(source)
    should(source).eql([a, b])
    should(sorted).eql([b, a])
    should(sorted).not.equal(source)
  })

  it('handles empty input', function () {
    should(sortMessages([])).eql([])
  })

  it('returns the same message objects', function () {
    const a = msg('a', 1)
    should(sortMessages([a])[0]).equal(a)
  })
})

describe('resolveFailedMessage', function () {
  it('returns a pending message so it can be flagged as failed', function () {
    const pending = msg('p', 4, { pending: true })
    should(resolveFailedMessage('p', [msg('a', 3), pending])).equal(pending)
  })

  it('returns null for a message that was delivered', function () {
    // The server copy clears `pending` (chatroom.js `addMessage` process), so a
    // delivered message must never gain a retry affordance.
    const delivered = msg('d', 4)
    should(resolveFailedMessage('d', [msg('a', 3), delivered])).equal(null)
  })

  it('returns null when the message is not in the state', function () {
    should(resolveFailedMessage('missing', [msg('a', 3)])).equal(null)
  })

  it('returns null for a missing hash', function () {
    const messages = [msg('a', 3, { pending: true })]
    should(resolveFailedMessage(null, messages)).equal(null)
    should(resolveFailedMessage(undefined, messages)).equal(null)
    should(resolveFailedMessage('', messages)).equal(null)
  })

  it('returns null for a missing message list', function () {
    should(resolveFailedMessage('a', null)).equal(null)
    should(resolveFailedMessage('a', undefined)).equal(null)
  })

  it('prefers the most recent entry for a duplicated hash', function () {
    // Matches `findMessageIdx`, which also searches backwards.
    const stale = msg('h', 1, { pending: true })
    const current = msg('h', 2)
    should(resolveFailedMessage('h', [stale, current])).equal(null)
    should(resolveFailedMessage('h', [current, stale])).equal(stale)
  })
})
