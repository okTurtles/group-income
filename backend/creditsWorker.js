'use strict'

import sbp from '@sbp/sbp'
import './genericWorker.js'

// Rate: How many credits are charged per byte stored per second.
// Using BigInt for precision.
// $FlowFixMe[cannot-resolve-name]
const CREDITS_PER_BYTESECOND = BigInt(1)
// History Limit: How many entries to keep in the granular history log.
const GRANULAR_HISTORY_MAX_ENTRIES = 1000
// const COARSE_HISTORY_MAX_ENTRIES = 1000
// const GRANULAR_ENTRIES_PER_COARSE_ENTRIES = 288

// Timestamp when this worker instance started. Used to avoid charging while the
// server is not running
const startTime = Date.now()

/**
 * Updates the credit balance and history for a given billable entity.
 * Can handle charging based on size/time or adding credits directly.
 * Uses an event queue for atomic updates per entity.
 *
 * @param billableEntity - The identifier of the entity to bill.
 * @param type - The type of update: 'charge' (based on size/time) or 'credit'
 * (direct addition).
 * @param amount - For 'charge', this is the current total size (bytes). For 'credit', the amount to add.
 */
export const updateCredits = async (billableEntity: string, type: 'credit' | 'charge', amount: number) => {
  const key = `_private_ownerBalanceHistoryGranular_${billableEntity}`
  // Use a queue to ensure atomic updates
  await sbp('okTurtles.eventQueue/queueEvent', key, async () => {
    const now = new Date()

    // Fetch the existing history. bypassCache ensures we get the latest state before calculating.
    // Performance concern: Reading/parsing about 1000 entries per contract
    const granularHistoryList = await sbp('chelonia.db/get', key, { bypassCache: true }) ?? '[]'
    const granularHistory = JSON.parse(granularHistoryList)

    // Trim the history if it exceeds the maximum length. Remove the oldest
    // entry (at the end)
    if (granularHistory.length >= GRANULAR_HISTORY_MAX_ENTRIES) {
      granularHistory.splice(GRANULAR_HISTORY_MAX_ENTRIES)
    }

    // Get the balance from the most recent history entry.
    const previousBalance = BigInt(granularHistory[0]?.balance || 0)

    if (type === 'charge') {
      // Get timestamp of the last recorded event. Default to 'now' if there's
      // no history, ensuring elapsed time is calculated correctly for the first
      // charge.
      const previousTime = new Date(granularHistory[0]?.date).getTime() || now.getTime()
      // Calculate time elapsed in seconds since the later of:
      // 1. The last event time stored in history.
      // 2. The time this worker process started (`startTime`).
      // This prevents charging for time before the last update or before the
      // service was running.
      const timeElapsed = Math.max(0, now.getTime() - Math.max(previousTime, startTime)) / 1000
      // Calculate credits used: size (amount) * time * rate.
      const creditsUsed = BigInt(Math.floor(amount * timeElapsed)) * CREDITS_PER_BYTESECOND

      // Calculate new balance
      const balance = (previousBalance - creditsUsed).toString(10)

      // Prepare the new history entry
      granularHistory.unshift({
        type: 'charge',
        date: now.toISOString(),
        sizeTotal: amount,
        credits: creditsUsed.toString(10),
        balance
      })

      // Persist the updated balance (optimization: faster reads elsewhere)
      await sbp('chelonia.db/set', `_private_ownerCreditBalance_${billableEntity}`, balance)
    } else if (type === 'credit') {
      // 'amount' is the credit amount here
      const creditsToAdd = BigInt(amount)
      const newBalance = previousBalance + creditsToAdd
      const newBalanceStr = newBalance.toString(10)

      // Prepare the new history entry for credit addition.
      const newEntry = {
        type: 'credit',
        date: now.toISOString(),
        credits: creditsToAdd.toString(10), // Credits added
        balance: newBalanceStr
      }

      granularHistory.unshift(newEntry)

      // Persist the updated balance
      await sbp('chelonia.db/set', `_private_ownerCreditBalance_${billableEntity}`, newBalanceStr)
    } else {
      console.error(`Invalid update type "${type}" for ${billableEntity}`)
      return // Don't save if type is invalid
    }

    await sbp('chelonia.db/set', key, JSON.stringify(granularHistory))
  })
}

sbp('okTurtles.eventQueue/queueEvent', 'parentPort', () => setTimeout(sbp, 30e3, 'worker/computeCredits'))

sbp('sbp/selectors/register', {
  'worker/computeCredits': async () => {
    const billableEntities = await sbp('chelonia.db/get', '_private_billable_entities', { bypassCache: true })
    if (!billableEntities) return

    // Fetch the list of all entities that should be billed.
    // Using bypassCache here ensures we don't miss newly added entities at the
    // cost of performance
    await Promise.all(billableEntities.split('\x00').map(async (billableEntity) => {
      // Fetch the current total size for the entity.
      const sizeString = await sbp('chelonia.db/get', `_private_ownerTotalSize_${billableEntity}`, { bypassCache: true })
      const size = parseInt(sizeString, 10)

      // Check if size is a valid number, otherwise skip (or log error)
      if (isNaN(size)) {
        console.warn(`Invalid size fetched for entity ${billableEntity}: ${sizeString}. Skipping charge.`)
        return
      }

      // Call updateCredits to calculate and record the charge based on current size and time elapsed.
      // Not using await to queue the call and immediately proceed with the next
      // billable entity
      updateCredits(billableEntity, 'charge', size).catch((e) => {
        // TODO
        console.error('@@@@@@err', billableEntity, e)
      })
    }))

    // Reschedule the task for the next interval.
    setTimeout(sbp, 30e3, 'worker/computeCredits')
  }
})
