import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import { PAYMENT_COMPLETED } from '@model/contracts/shared/payments/index.js'
import { createPaymentInfo, paymentHashesFromPaymentPeriod } from '@model/contracts/shared/functions.js'
import { humanDate, dateFromPeriodStamp, periodStampsForDate } from '@model/contracts/shared/time.js'
import { cloneDeep } from '@model/contracts/shared/giLodash.js'

// NOTE: this mixin combines payment information
// from both the current in-memory state and the archived payments on disk
const PaymentsMixin: Object = {
  computed: {
    ...mapState(['currentGroupId']),
    ...mapGetters([
      'currentGroupState',
      'dueDateForPeriod',
      'groupPeriodPayments',
      'groupSettings',
      'groupSortedPeriodKeys',
      'ourUsername',
      'ourPayments',
      'periodAfterPeriod',
      'periodBeforePeriod',
      'periodStampGivenDate',
      'paymentHashesForPeriod'
    ])
  },
  methods: {
    async historicalPeriodStampGivenPayment (payment) {
      return await this.historicalPeriodStampGivenDate(payment.date)
    },

    // Oldest key first.
    async getAllSortedPeriodKeys () {
      const historicalPaymentPeriods = await this.getHistoricalPaymentPeriods()
      return [
        ...Object.keys(historicalPaymentPeriods).sort(),
        ...this.groupSortedPeriodKeys
      ]
    },

    async historicalPeriodStampGivenDate (givenDate: string | Date) {
      return periodStampsForDate(givenDate, {
        knownSortedStamps: await this.getAllSortedPeriodKeys(),
        periodLength: this.groupSettings.distributionPeriodLength
      }).current
    },

    async historicalPeriodBeforePeriod (periodStamp: string) {
      return periodStampsForDate(periodStamp, {
        knownSortedStamps: await this.getAllSortedPeriodKeys(),
        periodLength: this.groupSettings.distributionPeriodLength
      }).previous
    },

    async historicalPeriodAfterPeriod (periodStamp: string) {
      return periodStampsForDate(periodStamp, {
        knownSortedStamps: await this.getAllSortedPeriodKeys(),
        periodLength: this.groupSettings.distributionPeriodLength
      }).next
    },

    async getDueDateForPeriod (periodStamp: string) {
      return await this.historicalPeriodAfterPeriod(periodStamp)
    },

    // ====================
    async getHistoricalPaymentPeriods () {
      const ourArchiveKey = `paymentsByPeriod/${this.ourUsername}/${this.currentGroupId}`
      return await sbp('gi.db/archive/load', ourArchiveKey) ?? {}
    },

    async getHistoricalPaymentsInTypes () {
      const paymentsInTypes = {
        sent: cloneDeep(this.ourPayments?.sent || []),
        received: cloneDeep(this.ourPayments?.received || []),
        todo: cloneDeep(this.ourPayments?.todo || [])
      }
      const paymentsByPeriod = await this.getHistoricalPaymentPeriods()

      for (const period of Object.keys(paymentsByPeriod).sort().reverse()) {
        const paymentsKey = `payments/${this.ourUsername}/${period}/${this.currentGroupId}`
        const payments = await sbp('gi.db/archive/load', paymentsKey) || {}
        const { paymentsFrom } = paymentsByPeriod[period]
        for (const fromUser of Object.keys(paymentsFrom)) {
          for (const toUser of Object.keys(paymentsFrom[fromUser])) {
            if (toUser === this.ourUsername || fromUser === this.ourUsername) {
              const receivedOrSent = toUser === this.ourUsername ? 'received' : 'sent'
              for (const hash of paymentsFrom[fromUser][toUser]) {
                if (hash in payments) {
                  const { data, meta } = payments[hash]
                  paymentsInTypes[receivedOrSent].push({ hash, data, meta, amount: data.amount, username: toUser, period })
                } else {
                  console.error(`getHistoricalPaymentsInTypes: couldn't find payment ${hash} for period ${period}!`)
                }
              }
            }
          }
        }
      }
      const sortPayments = payments => payments
        .sort((f, l) => f.meta.createdDate > l.meta.createdDate ? 1 : -1)
      paymentsInTypes.sent = sortPayments(paymentsInTypes.sent)
      paymentsInTypes.received = sortPayments(paymentsInTypes.received)

      return paymentsInTypes
    },
    async getPaymentDetailsByPeriod (period: string) {
      let detailedPayments = {}
      if (Object.keys(this.groupPeriodPayments).includes(period)) {
        const paymentHashes = this.paymentHashesForPeriod(period) || []
        detailedPayments = Object.fromEntries(paymentHashes.map(hash => [hash, this.currentGroupState.payments[hash]]))
      } else {
        const paymentsByPeriod = await this.getHistoricalPaymentPeriods()
        const paymentHashes = paymentHashesFromPaymentPeriod(paymentsByPeriod[period])

        const paymentsKey = `payments/${this.ourUsername}/${period}/${this.currentGroupId}`
        const payments = await sbp('gi.db/archive/load', paymentsKey) || {}
        for (const hash of paymentHashes) {
          detailedPayments[hash] = payments[hash]
        }
      }
      return detailedPayments
    },
    async getPaymentsByPeriod (period: string) {
      const payments = []
      const paymentsByHash = await this.getPaymentDetailsByPeriod(period)
      for (const hash of Object.keys(paymentsByHash)) {
        const payment = paymentsByHash[hash]
        if (payment.data.status === PAYMENT_COMPLETED) {
          payments.push(createPaymentInfo(hash, payment))
        }
      }
      return payments
    },
    async getHistoricalPaymentByHashAndPeriod (hash: string, period: string) {
      const paymentsKey = `payments/${this.ourUsername}/${period}/${this.currentGroupId}`
      const payments = await sbp('gi.db/archive/load', paymentsKey) || {}

      return payments[hash]
    },
    async getHaveNeedsSnapshotByPeriod (period: string) {
      if (Object.keys(this.groupPeriodPayments).includes(period)) {
        return this.groupPeriodPayments[period].haveNeedsSnapshot || []
      }

      const paymentsByPeriod = await this.getHistoricalPaymentPeriods()
      return Object.keys(paymentsByPeriod).includes(period)
        ? paymentsByPeriod[period].haveNeedsSnapshot || []
        : []
    },
    async getTotalTodoAmountForPeriod (period: string) {
      const haveNeeds = await this.getHaveNeedsSnapshotByPeriod(period)
      let total = 0

      for (const { haveNeed } of haveNeeds) {
        if (haveNeed < 0) { total += -1 * haveNeed }
      }
      return total
    },
    async getTotalPledgesDoneForPeriod (period: string) {
      const payments = await this.getPaymentsByPeriod(period)
      let total = 0

      for (const { amount } of payments) {
        total += amount
      }
      return total
    },
    // Returns the stored payment period object for a given period stamp,
    // or an empty object if not found.
    // TODOs: rename to getPaymentPeriod, and maybe avoid loading all historical payment periods.
    async getPeriodPayment (period: string) {
      if (Object.keys(this.groupPeriodPayments).includes(period)) {
        return this.groupPeriodPayments[period] || {}
      }
      const archPaymentsByPeriod = await this.getHistoricalPaymentPeriods()
      return archPaymentsByPeriod[period] || {}
    },
    // Returns a human-readable description of the time interval identified by a given period stamp.
    getPeriodFromStartToDueDate (period) {
      const dueDate = this.dueDateForPeriod(period)
      return `${humanDate(dateFromPeriodStamp(period))} - ${humanDate(dateFromPeriodStamp(dueDate))}`
    }
  }
}

export default PaymentsMixin
