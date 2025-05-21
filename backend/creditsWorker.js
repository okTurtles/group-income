'use strict'

import sbp from '@sbp/sbp'
import { CREDITS_WORKER_TASK_TIME_INTERVAL as TASK_TIME_INTERVAL } from './constants.js'
import { readyQueueName } from './genericWorker.js'

// Rate: How many credits are charged per byte stored per second.
// Using BigInt for precision. Using 'picocredits' so that ~1k 'credits' cover
// about 100MiB for a period of one year, while allowing granularity and precision.
// $FlowFixMe[cannot-resolve-name]
const PICOCREDITS_PER_BYTESECOND = BigInt(10)
// History Limit: How many entries to keep in the granular history log.
const GRANULAR_HISTORY_MAX_ENTRIES = 1000
const COARSE_HISTORY_MAX_ENTRIES = 1000
// 288 is about one day, if granular entries are every 5 minutes
const GRANULAR_ENTRIES_PER_COARSE_ENTRIES = 288

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
const updateCredits = async (billableEntity: string, type: 'credit' | 'charge', amount: number) => {
  const granularHistoryKey = `_private_ownerBalanceHistoryGranular_${billableEntity}`
  // Use a queue to ensure atomic updates
  await sbp('okTurtles.eventQueue/queueEvent', granularHistoryKey, async () => {
    const now = new Date()
    const date = now.toISOString()

    // Fetch the existing history. bypassCache ensures we get the latest state before calculating.
    // Performance concern: Reading/parsing about 1000 entries per contract
    const granularHistoryList = await sbp('chelonia.db/get', granularHistoryKey, { bypassCache: true }) ?? '[]'
    const granularHistory = JSON.parse(granularHistoryList)

    // Trim the history if it exceeds the maximum length. Remove the oldest
    // entry (at the end)
    // Done early here to allow the allocator to free up memory
    // Using `- 1` since a new entry will be added.
    if (granularHistory.length >= GRANULAR_HISTORY_MAX_ENTRIES - 1) {
      granularHistory.splice(GRANULAR_HISTORY_MAX_ENTRIES - 1)
    }

    // Get the balance from the most recent history entry.
    const previousPcBalance = BigInt(granularHistory[0]?.balancePicocreditAmount || 0)

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
      const timeElapsed = Math.max(0, now.getTime() - Math.max(previousTime, startTime))
      // Calculate credits used: size (amount) * time * rate.
      const picocreditsUsed = BigInt(Math.floor(amount * timeElapsed / 1000)) * PICOCREDITS_PER_BYTESECOND

      // Calculate new balance
      const balancePicocreditAmount = (previousPcBalance - picocreditsUsed).toString(10)

      // Prepare the new history entry
      granularHistory.unshift({
        type: 'charge',
        date,
        sizeTotal: amount,
        picocreditAmount: picocreditsUsed.toString(10),
        // Period in ISO 8601 format, i.e., `{start}/{end}`
        period: `${new Date(now - timeElapsed).toISOString()}/${date}`,
        balancePicocreditAmount
      })

      // Persist the updated balance (optimization: faster reads elsewhere)
      await sbp('chelonia.db/set', `_private_ownerPicocreditBalance_${billableEntity}`, balancePicocreditAmount)
    } else if (type === 'credit') {
      // 'amount' is the credit amount here
      const picocreditsToAdd = BigInt(amount)
      const newBalance = previousPcBalance + picocreditsToAdd
      const newBalanceStr = newBalance.toString(10)

      // Prepare the new history entry for credit addition.
      const newEntry = {
        type: 'credit',
        date,
        picocreditAmount: picocreditsToAdd.toString(10), // Credits added
        balancePicocreditAmount: newBalanceStr
      }

      granularHistory.unshift(newEntry)

      // Persist the updated balance
      await sbp('chelonia.db/set', `_private_ownerPicocreditBalance_${billableEntity}`, newBalanceStr)
    } else {
      console.error(`[creditsWorker] Invalid update type "${type}" for ${billableEntity}`)
      return // Don't save if type is invalid
    }

    // Do we need to update the coarse history?
    const lastCoarseSyncIdx = granularHistory.findIndex((value) => {
      return !!(value.coarseSyncPoint)
    })

    if (lastCoarseSyncIdx >= GRANULAR_ENTRIES_PER_COARSE_ENTRIES || lastCoarseSyncIdx < 0) {
      const coarseHistoryKey = `_private_ownerBalanceHistoryCoarse_${billableEntity}`
      granularHistory[0].coarseSyncPoint = true
      const coarseHistoryList = await sbp('chelonia.db/get', coarseHistoryKey, { bypassCache: true }) ?? '[]'
      const coarseHistory = JSON.parse(coarseHistoryList)

      // Trim entries. Done early here to allow the allocator to free up memory,
      // and using `- 1` since a new entry will be added.
      if (coarseHistory.length >= COARSE_HISTORY_MAX_ENTRIES - 1) {
        coarseHistory.splice(COARSE_HISTORY_MAX_ENTRIES - 1)
      }

      const { periodStart, charges, credits, periodSize, totalPeriodLength } = granularHistory.slice(0, lastCoarseSyncIdx < 0 ? granularHistory.length : lastCoarseSyncIdx).reduce((acc, entry) => {
        if (entry.type === 'charge') {
          acc.charges += BigInt(entry.picocreditAmount)
          const [periodStart, periodEnd] = entry.period.split('/')
          const [periodStartDate, periodEndDate] = [Date.parse(periodStart), Date.parse(periodEnd)]
          const periodLength = Math.floor(periodEndDate - periodStartDate)
          // Avoid NaN propagation
          if (periodLength >= 0) {
            acc.periodSize += entry.sizeTotal * periodLength
            acc.totalPeriodLength += periodLength
          }
          acc.periodStart = periodStart
        } else if (entry.type === 'credit') {
          acc.credits += BigInt(entry.picocreditAmount)
        } else {
          throw new Error('Invalid entry type: ' + entry.type)
        }

        return acc
      }, { charges: BigInt(0), credits: BigInt(0), periodStart: date, periodSize: 0, totalPeriodLength: 0 })

      coarseHistory.unshift({
        type: 'aggregate',
        date,
        sizeTotal: totalPeriodLength > 0 ? Math.floor(periodSize / totalPeriodLength) : 0,
        chargesPicocreditAmount: charges.toString(10),
        creditsPicocreditAmount: credits.toString(10),
        period: `${periodStart}/${date}`,
        balancePicocreditAmount: granularHistory[0].balancePicocreditAmount
      })

      await sbp('chelonia.db/set', coarseHistoryKey, JSON.stringify(coarseHistory))
    }

    await sbp('chelonia.db/set', granularHistoryKey, JSON.stringify(granularHistory))
  })
}

sbp('okTurtles.eventQueue/queueEvent', readyQueueName, () => setTimeout(sbp, TASK_TIME_INTERVAL, 'worker/computeCredits'))

sbp('sbp/selectors/register', {
  'worker/computeCredits': async () => {
    const billableEntities = await sbp('chelonia.db/get', '_private_billable_entities', { bypassCache: true })

    // Fetch the list of all entities that should be billed.
    // Using bypassCache here ensures we don't miss newly added entities at the
    // cost of performance
    billableEntities && await Promise.all(billableEntities.split('\x00').map(async (billableEntity) => {
      // Fetch the current total size for the entity.
      const sizeString = await sbp('chelonia.db/get', `_private_ownerTotalSize_${billableEntity}`, { bypassCache: true })
      const size = parseInt(sizeString, 10)

      // Check if size is a valid number, otherwise skip (or log error)
      if (isNaN(size)) {
        console.warn(`[creditsWorker] Invalid size fetched for entity ${billableEntity}: ${sizeString}. Skipping charge.`)
        return
      }

      // Call updateCredits to calculate and record the charge based on current size and time elapsed.
      // Not using await to queue the call and immediately proceed with the next
      // billable entity
      updateCredits(billableEntity, 'charge', size).catch((e) => {
        console.error(e, '[creditsWorker] Error computing balance', billableEntity)
      })
    }))

    // Reschedule the task for the next interval.
    setTimeout(sbp, TASK_TIME_INTERVAL, 'worker/computeCredits')
  }
})
