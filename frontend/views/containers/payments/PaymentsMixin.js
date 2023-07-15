import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import { PAYMENT_COMPLETED } from '@model/contracts/shared/payments/index.js'
import { createPaymentInfo, paymentHashesFromPaymentPeriod } from '@model/contracts/shared/functions.js'
import { humanDate, dateFromPeriodStamp } from '@model/contracts/shared/time.js'
import { cloneDeep } from '@model/contracts/shared/giLodash.js'

// NOTE: this mixin combines payment information
// from both the current in-memory state and the archived payments on disk
const PaymentsMixin: Object = {
  computed: {
    ...mapState(['currentGroupId']),
    ...mapGetters([
      'currentGroupState',
      'ourUsername',
      'ourPayments',
      'groupPeriodPayments',
      'paymentHashesForPeriod',
      'dueDateForPeriod'
    ])
  },
  methods: {
    async getHistoricalPaymentsInTypes () {
      const paymentsInTypes = {
        sent: cloneDeep(this.ourPayments?.sent || []),
        received: cloneDeep(this.ourPayments?.received || []),
        todo: cloneDeep(this.ourPayments?.todo || [])
      }

      const paymentsByPeriodKey = `paymentsByPeriod/${this.ourUsername}/${this.currentGroupId}`
      const paymentsByPeriod = await sbp('gi.db/archive/load', paymentsByPeriodKey) || {}

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
                  paymentsInTypes[receivedOrSent].push({ hash, data, meta, amount: data.amount, username: toUser })
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
        const paymentsByPeriodKey = `paymentsByPeriod/${this.ourUsername}/${this.currentGroupId}`
        const paymentsByPeriod = await sbp('gi.db/archive/load', paymentsByPeriodKey) || {}
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

      const paymentsByPeriodKey = `paymentsByPeriod/${this.ourUsername}/${this.currentGroupId}`
      const paymentsByPeriod = await sbp('gi.db/archive/load', paymentsByPeriodKey) || {}
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
    async getPeriodPayment (period: string) {
      if (Object.keys(this.groupPeriodPayments).includes(period)) {
        return this.groupPeriodPayments[period] || {}
      }

      const archPaymentsByPeriodKey = `paymentsByPeriod/${this.ourUsername}/${this.currentGroupId}`
      const archPaymentsByPeriod = await sbp('gi.db/archive/load', archPaymentsByPeriodKey) || {}
      return archPaymentsByPeriod[period] || {}
    },
    getPeriodFromStartToDueDate (period) {
      const dueDate = this.dueDateForPeriod(period)
      return `${humanDate(dateFromPeriodStamp(period))} - ${humanDate(dateFromPeriodStamp(dueDate))}`
    }
  }
}

export default PaymentsMixin
