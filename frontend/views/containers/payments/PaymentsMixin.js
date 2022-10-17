import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import { PAYMENT_COMPLETED } from '@model/contracts/shared/payments/index.js'

const PaymentsMixin: Object = {
  computed: {
    ...mapState(['currentGroupId']),
    ...mapGetters([
      'paymentsForPeriod',
      'ourUsername',
      'currentPaymentPeriod',
      'periodBeforePeriod'
    ])
  },
  methods: {
    async getPaymentsByPeriod (period: string) {
      const payments = this.paymentsForPeriod(period)
      if (payments.length) {
        return payments
      }

      // the rule to make key is there inside `archivePayments` function of group.js contract
      const periodKey = `paymentPeriods/${this.ourUsername}/${this.currentGroupId}`
      const periods = await sbp('gi.db/archive/load', periodKey) || []
      if (periods.includes(period)) {
        const paymentsKey = `paymentsByPeriod/${this.ourUsername}/${this.currentGroupId}/${period}`
        const paymentsByHash = await sbp('gi.db/archive/load', paymentsKey) || {}
        for (const hash of Object.keys(paymentsByHash)) {
          const payment = paymentsByHash[hash]
          if (payment.data.status === PAYMENT_COMPLETED) {
            payments.push({
              from: payment.meta.username,
              to: payment.data.toUser,
              hash,
              amount: payment.data.amount,
              isLate: !!payment.data.isLate,
              when: payment.data.completedDate
            })
          }
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
