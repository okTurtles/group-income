'use strict'

// The general banner (BannerGeneral.vue) has one slot per owner. The first
// non-empty slot in this list is the one displayed, so that, e.g., a
// 'Loading events from server...' banner can neither hide nor remove the
// connection banner, and clearing one slot reveals the next one.
export type BannerSlot = 'danger' | 'connection' | 'transient'

export const BANNER_SLOTS: $ReadOnlyArray<BannerSlot> = ['danger', 'connection', 'transient']

export type BannerEntry = { message: string, icon: string }

export type BannerSlots = { [slot: BannerSlot]: ?BannerEntry }

export type DisplayedBanner = {
  slot: BannerSlot,
  message: string,
  icon: string,
  severity: 'danger' | 'neutral'
}

export const emptyBannerSlots = (): BannerSlots => ({ danger: null, connection: null, transient: null })

// Sets a slot (or empties it, without a message) and returns its entry. The
// slot is typed so that a typo fails Flow instead of adding a key that Vue
// doesn't track and `pickBanner` ignores.
export const setSlot = (slots: BannerSlots, slot: BannerSlot, message: ?string, icon: string): ?BannerEntry => {
  const entry = message ? { message, icon } : null
  slots[slot] = entry
  return entry
}

// The slots `gi.ui/clearBanner` clears: the connection banner has a single
// owner (main.js), which clears it with `gi.ui/clearConnectionBanner`
const CLEARABLE_SLOTS: $ReadOnlyArray<BannerSlot> = ['danger', 'transient']

// Without `entry`, clears the danger and transient slots (`gi.ui/clearBanner`).
// With an entry returned by `setSlot()`, clears it only where it is still
// displayed (`debouncedShow`), so that a banner set meanwhile stays.
export const clearSlots = (slots: BannerSlots, entry?: ?BannerEntry): void => {
  for (const slot of CLEARABLE_SLOTS) {
    if (!entry || slots[slot] === entry) slots[slot] = null
  }
}

export const pickBanner = (slots: ?BannerSlots): DisplayedBanner | null => {
  if (!slots) return null
  for (const slot of BANNER_SLOTS) {
    const entry = slots[slot]
    if (entry && entry.message) {
      return {
        slot,
        message: entry.message,
        icon: entry.icon,
        severity: slot === 'danger' ? 'danger' : 'neutral'
      }
    }
  }
  return null
}
