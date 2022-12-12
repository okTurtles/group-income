import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import { PAYMENT_COMPLETED } from '@model/contracts/shared/payments/index.js'
import { createPaymentInfo } from '@model/contracts/shared/functions.js'
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
      if (Object.keys(this.groupPeriodPayments).includes(period)) {
        const paymentHashes = this.paymentHashesForPeriod(period) || []
        return Object.fromEntries(paymentHashes.map(hash => [hash, this.currentGroupState.payments[hash]]))
      }

      const paymentsKey = `payments/${period}/${this.ourUsername}/${this.currentGroupId}`
      return await sbp('gi.db/archive/load', paymentsKey) || {}
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
    async getHistoricalPaymentByHashAndPeriod (period: string, hash: string) {
      const paymentsKey = `payments/${period}/${this.ourUsername}/${this.currentGroupId}`
      const payments = await sbp('gi.db/archive/load', paymentsKey) || {}
      return payments[hash]
    }
  }
}

export default PaymentsMixin
