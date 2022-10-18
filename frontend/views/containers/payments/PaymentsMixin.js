import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import { PAYMENT_COMPLETED } from '@model/contracts/shared/payments/index.js'
import { simplifyPayment, getPaymentHashes } from '@model/contracts/shared/functions.js'
import { cloneDeep } from '@model/contracts/shared/giLodash.js'

const PaymentsMixin: Object = {
  computed: {
    ...mapState(['currentGroupId']),
    ...mapGetters([
      'currentGroupState',
      'ourUsername',
      'ourPayments',
      'paymentsForPeriod',
      'periodBeforePeriod',
      'groupPeriodPayments',
      'currentPaymentPeriod',
      'paymentHashesForPeriod',
      'groupIncomeAdjustedDistribution'
    ])
  },
  methods: {
    async getHistoricalPaymentsInTypes () {
      const paymentsInTypes = {
        sent: cloneDeep(this.ourPayments?.sent),
        received: cloneDeep(this.ourPayments?.received),
        todo: this.groupIncomeAdjustedDistribution.filter(p => p.from === this.ourUsername)
      }

      const paymentsByPeriodKey = `paymentsByPeriod/${this.ourUsername}/${this.currentGroupId}`
      const paymentsByPeriod = await sbp('gi.db/archive/load', paymentsByPeriodKey) || {}
      const paymentsKey = `payments/${this.ourUsername}/${this.currentGroupId}`
      const payments = await sbp('gi.db/archive/load', paymentsKey) || {}

      for (const period of Object.keys(paymentsByPeriod).sort().reverse()) {
        const { paymentsFrom } = paymentsByPeriod[period]
        for (const fromUser of Object.keys(paymentsFrom)) {
          for (const toUser of Object.keys(paymentsFrom[fromUser])) {
            if (toUser === this.ourUsername) {
              for (const rHash of paymentsFrom[fromUser][toUser]) {
                const { data, meta } = payments[rHash]
                paymentsInTypes.received.push({ hash: rHash, data, meta, amount: data.amount, username: data.toUser })
              }
            } else if (fromUser === this.ourUsername) {
              for (const sHash of paymentsFrom[fromUser][toUser]) {
                const { data, meta } = payments[sHash]
                paymentsInTypes.sent.push({ hash: sHash, data, meta, amount: data.amount, username: data.toUser })
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
        const paymentHashes = getPaymentHashes(paymentsByPeriod[period])

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
          payments.push(simplifyPayment(hash, payment))
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
