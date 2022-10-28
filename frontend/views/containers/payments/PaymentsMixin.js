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
      const paymentsInTypes = {
        sent: cloneDeep(this.ourPayments?.sent || []),
        received: cloneDeep(this.ourPayments?.received || []),
        todo: cloneDeep(this.ourPayments?.todo || [])
      }

      const paymentsByPeriodKey = `paymentsByPeriod/${this.ourUsername}/${this.currentGroupId}`
      const paymentsByPeriod = await sbp('gi.db/archive/load', paymentsByPeriodKey) || {}
      const paymentsKey = `payments/${this.ourUsername}/${this.currentGroupId}`
      const payments = await sbp('gi.db/archive/load', paymentsKey) || {}

      for (const period of Object.keys(paymentsByPeriod).sort().reverse()) {
        const { paymentsFrom } = paymentsByPeriod[period]
        for (const fromUser of Object.keys(paymentsFrom)) {
          for (const toUser of Object.keys(paymentsFrom[fromUser])) {
            if (toUser === this.ourUsername || fromUser === this.ourUsername) {
              const receivedOrSent = toUser === this.ourUsername ? 'received' : 'sent'
              for (const hash of paymentsFrom[fromUser][toUser]) {
                const { data, meta } = payments[hash]
                paymentsInTypes[receivedOrSent].push({ hash, data, meta, amount: data.amount, username: toUser })
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
