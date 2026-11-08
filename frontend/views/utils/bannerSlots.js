'use strict'

// The general banner (BannerGeneral.vue) has one slot per owner. The first
// non-empty slot in this list is the one displayed, so that, e.g., a
// "Copied to clipboard" banner can neither hide nor remove the connection
// banner, and clearing one slot reveals the next one.
export const BANNER_SLOTS: Array<string> = ['danger', 'connection', 'transient']

export type BannerEntry = { message: string, icon: string }

export type BannerSlots = { [slot: string]: ?BannerEntry }

export type DisplayedBanner = {
  slot: string,
  message: string,
  icon: string,
  severity: 'danger' | 'neutral'
}

export const emptyBannerSlots = (): BannerSlots =>
  Object.fromEntries(BANNER_SLOTS.map(slot => [slot, null]))

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
