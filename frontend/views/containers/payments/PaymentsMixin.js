import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import { PAYMENT_COMPLETED } from '@model/contracts/shared/payments/index.js'
import { humanReadablePayment } from '@model/contracts/shared/functions.js'

const PaymentsMixin: Object = {
  computed: {
    ...mapState(['currentGroupId']),
    ...mapGetters([
      'paymentsForPeriod',
      'ourUsername',
      'currentPaymentPeriod',
      'periodBeforePeriod',
      'paymentHashesForPeriod',
      'currentGroupState'
    ])
  },
  methods: {
    async getNativePaymentsByPeriod (period: string) {
      let nativePayments = {}
      if (period === this.currentPaymentPeriod || period === this.periodBeforePeriod(this.currentPaymentPeriod)) {
        const paymentHashes = this.paymentHashesForPeriod(period)
        nativePayments = paymentHashes.map(hash => this.currentGroupState.payments[hash])
      } else {
        const periodKey = `paymentPeriods/${this.ourUsername}/${this.currentGroupId}`
        const periods = await sbp('gi.db/archive/load', periodKey) || []
        if (periods.includes(period)) {
          const paymentsKey = `paymentsByPeriod/${this.ourUsername}/${this.currentGroupId}/${period}`
          nativePayments = await sbp('gi.db/archive/load', paymentsKey) || {}
        }
      }
      return nativePayments
    },
    async getPaymentsByPeriod (period: string) {
      const payments = []
      const paymentsByHash = await this.getNativePaymentsByPeriod(period)
      for (const hash of Object.keys(paymentsByHash)) {
        const payment = paymentsByHash[hash]
        if (payment.data.status === PAYMENT_COMPLETED) {
          payments.push(humanReadablePayment(hash, payment))
        }
      }
      return payments
    },
    getHistoricalPeriods (numPeriods: number, skip?: number) {
      let lastPeriod = this.currentPaymentPeriod

      if (skip) {
        for (let i = 0; i < skip; i++) {
          lastPeriod = this.periodBeforePeriod(lastPeriod)
        }
      }

      const periods = [lastPeriod]
      for (let i = 0; i < numPeriods - 1; i++) {
        periods.unshift(this.periodBeforePeriod(periods[0]))
      }
      return periods
    },
    async getHistoricalPayments (numPeriods: number, skip?: number) {
      const periods = this.getHistoricalPeriods(numPeriods, skip)

      const payments = await Promise.all(periods.map(period => this.getPaymentsByPeriod(period)))

      return { periods, payments }
    }
  }
}

export default PaymentsMixin
