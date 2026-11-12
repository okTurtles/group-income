/* eslint-env mocha */
import assert from 'node:assert/strict'
import { BANNER_SLOTS, clearSlots, emptyBannerSlots, pickBanner, setSlot } from './bannerSlots.js'

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

  it('sets a slot and returns its entry, and empties it without a message', () => {
    const slots = emptyBannerSlots()
    const shown = setSlot(slots, 'connection', 'Trying to reconnect...', 'wifi')
    assert.deepEqual(shown, entry('Trying to reconnect...'))
    assert.equal(slots.connection, shown)
    assert.deepEqual(slots, { danger: null, connection: shown, transient: null })
    assert.equal(setSlot(slots, 'connection', '', 'wifi'), null)
    assert.equal(setSlot(slots, 'transient', null, 'wifi'), null)
    assert.deepEqual(slots, emptyBannerSlots())
  })

  it('clears the danger and transient slots, never the connection slot, without an entry', () => {
    const connection = entry('Your device appears to be offline.')
    const slots = {
      danger: entry('Fatal error', 'exclamation-triangle'),
      connection,
      transient: entry('Loading events from server...')
    }
    clearSlots(slots)
    assert.deepEqual(slots, { danger: null, connection, transient: null })
    assert.equal(slots.connection, connection)
    clearSlots(slots, null)
    assert.equal(slots.connection, connection)
  })

  it('clears only the given entry: the danger and connection banners survive clearing the sync banner', () => {
    const danger = entry('Fatal error', 'exclamation-triangle')
    const connection = entry('Trying to reconnect...')
    const sync = entry('Loading events from server...')
    const slots = { danger, connection, transient: sync }
    clearSlots(slots, sync)
    assert.deepEqual(slots, { danger, connection, transient: null })
    assert.equal(slots.danger, danger)
    assert.equal(slots.connection, connection)
    assert.equal(pickBanner(slots)?.message, 'Fatal error')
    clearSlots(slots, danger)
    assert.deepEqual(slots, { danger: null, connection, transient: null })
    assert.equal(slots.connection, connection)
  })

  it('does not clear a transient entry that replaced the given one', () => {
    const sync = entry('Loading events from server...')
    const newer = entry('Loading events from server...')
    const slots = { ...emptyBannerSlots(), transient: sync }
    slots.transient = newer
    clearSlots(slots, sync)
    assert.equal(slots.transient, newer)
    assert.equal(pickBanner(slots)?.message, 'Loading events from server...')
  })

  it('does nothing for an entry that is no longer displayed', () => {
    const sync = entry('Loading events from server...')
    const danger = entry('Fatal error', 'exclamation-triangle')
    const connection = entry('Trying to reconnect...')
    const slots = { ...emptyBannerSlots(), transient: sync }
    clearSlots(slots, sync)
    slots.danger = danger
    slots.connection = connection
    clearSlots(slots, sync)
    assert.deepEqual(slots, { danger, connection, transient: null })
    assert.equal(slots.danger, danger)
    assert.equal(slots.connection, connection)
  })

  it('ignores unknown slots', () => {
    assert.equal(pickBanner({ ...emptyBannerSlots(), other: entry('Unknown') }), null)
  })
})
