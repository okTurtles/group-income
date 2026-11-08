/* eslint-env mocha */
import assert from 'node:assert/strict'
import { BANNER_SLOTS, emptyBannerSlots, pickBanner } from './bannerSlots.js'

const entry = (message, icon = 'wifi') => ({ message, icon })

describe('bannerSlots', () => {
  it('orders the slots by priority: danger, connection, transient', () => {
    assert.deepEqual(BANNER_SLOTS, ['danger', 'connection', 'transient'])
  })

  it('creates one empty entry per slot', () => {
    assert.deepEqual(emptyBannerSlots(), { danger: null, connection: null, transient: null })
    assert.notEqual(emptyBannerSlots(), emptyBannerSlots())
  })

  it('shows nothing when every slot is empty', () => {
    assert.equal(pickBanner(emptyBannerSlots()), null)
    assert.equal(pickBanner(null), null)
    assert.equal(pickBanner(undefined), null)
  })

  it('treats an entry without a message as empty', () => {
    const slots = { ...emptyBannerSlots(), connection: entry(''), transient: entry('Copied to clipboard', 'check-circle') }
    assert.deepEqual(pickBanner(slots), {
      slot: 'transient', message: 'Copied to clipboard', icon: 'check-circle', severity: 'neutral'
    })
  })

  it('shows each slot on its own with its severity', () => {
    assert.deepEqual(pickBanner({ ...emptyBannerSlots(), danger: entry('Fatal error', 'exclamation-triangle') }), {
      slot: 'danger', message: 'Fatal error', icon: 'exclamation-triangle', severity: 'danger'
    })
    assert.deepEqual(pickBanner({ ...emptyBannerSlots(), connection: entry('Trying to reconnect...') }), {
      slot: 'connection', message: 'Trying to reconnect...', icon: 'wifi', severity: 'neutral'
    })
    assert.deepEqual(pickBanner({ ...emptyBannerSlots(), transient: entry('Loading events from server...') }), {
      slot: 'transient', message: 'Loading events from server...', icon: 'wifi', severity: 'neutral'
    })
  })

  it('prefers connection over transient, and danger over both', () => {
    const slots = {
      ...emptyBannerSlots(),
      connection: entry('Trying to reconnect...'),
      transient: entry('Copied to clipboard', 'check-circle')
    }
    assert.equal(pickBanner(slots)?.slot, 'connection')
    slots.danger = entry('Fatal error', 'exclamation-triangle')
    assert.equal(pickBanner(slots)?.slot, 'danger')
  })

  it('reveals the next slot when one is cleared', () => {
    const slots = {
      danger: entry('Fatal error', 'exclamation-triangle'),
      connection: entry('Trying to reconnect...'),
      transient: entry('Copied to clipboard', 'check-circle')
    }
    slots.danger = null
    assert.equal(pickBanner(slots)?.message, 'Trying to reconnect...')
    slots.connection = null
    assert.equal(pickBanner(slots)?.message, 'Copied to clipboard')
    slots.transient = null
    assert.equal(pickBanner(slots), null)
  })

  it('keeps the connection banner when the transient slot is set and cleared (B6)', () => {
    const slots = { ...emptyBannerSlots(), connection: entry('Your device appears to be offline.') }
    slots.transient = entry('Copied to clipboard', 'check-circle')
    assert.equal(pickBanner(slots)?.message, 'Your device appears to be offline.')
    slots.transient = null
    assert.equal(pickBanner(slots)?.message, 'Your device appears to be offline.')
  })

  it('ignores unknown slots', () => {
    assert.equal(pickBanner({ ...emptyBannerSlots(), other: entry('Unknown') }), null)
  })
})
