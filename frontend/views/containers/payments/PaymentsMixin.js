import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import { PAYMENT_COMPLETED } from '@model/contracts/shared/payments/index.js'
import { createPaymentInfo, paymentHashesFromPaymentPeriod } from '@model/contracts/shared/functions.js'
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
      'paymentHashesForPeriod'
    ])
  },
  methods: {
    async getHistoricalPaymentsInTypes () {
      const recentSentOrReceivedPayments = {
        sent: cloneDeep(this.ourPayments?.sent || []),
        received: cloneDeep(this.ourPayments?.received || []),
        todo: cloneDeep(this.ourPayments?.todo || [])
      }

      const historicalSentOrReceivedPaymentsKey = `sentOrReceivedPayments/${this.ourUsername}/${this.currentGroupId}`
      const historicalSentOrReceivedPayments = await sbp('gi.db/archive/load', historicalSentOrReceivedPaymentsKey) ||
        { sent: [], received: [] }

      return {
        sent: [...recentSentOrReceivedPayments.sent, ...historicalSentOrReceivedPayments.sent],
        received: [...recentSentOrReceivedPayments.received, ...historicalSentOrReceivedPayments.received],
        todo: recentSentOrReceivedPayments.todo
      }
    },
    async getPaymentDetailsByPeriod (period: string) {
      let detailedPayments = {}
      if (Object.keys(this.groupPeriodPayments).includes(period)) {
        const paymentHashes = this.paymentHashesForPeriod(period) || []
        detailedPayments = paymentHashes.map(hash => this.currentGroupState.payments[hash])
      } else {
        const paymentsByPeriodKey = `paymentsByPeriod/${this.ourUsername}/${this.currentGroupId}`
        const paymentsByPeriod = await sbp('gi.db/archive/load', paymentsByPeriodKey) || {}
        const paymentHashes = paymentHashesFromPaymentPeriod(paymentsByPeriod[period])

        const paymentsKey = `payments/${this.ourUsername}/${this.currentGroupId}`
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
    async getHistoricalPaymentByHash (hash: string) {
      const paymentsKey = `payments/${this.ourUsername}/${this.currentGroupId}`
      const payments = await sbp('gi.db/archive/load', paymentsKey) || {}
      return payments[hash]
    }
  }
}

export default PaymentsMixin
