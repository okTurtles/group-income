<template lang='pug'>
.c-summary
  i18n.c-summary-title.is-title-4(
    tag='h4'
    data-test='thisMonth'
    :args='{ month: thisMonth() }'
  ) {month} overview

  .c-summary-item(
    v-for='(item, index) in paymentSummary'
    :key='index'
  )
    h5.label {{ item.title }}

    progress-bar.c-progress(
      :max='item.max'
      :value='item.value'
      :hasMarks='item.hasMarks'
    )
    p(:class='{"has-text-success": item.max === item.value}')
      i.icon-check(v-if='item.max === item.value')
      .has-text-1 {{ item.label }}
</template>

<script>
import currencies from '@view-utils/currencies.js'
import { mapGetters } from 'vuex'
import ProgressBar from '@components/graphs/Progress.vue'

export default {
  name: 'MonthOverview',
  components: {
    ProgressBar
  },
  data () {
    return {
      // Temp
      monthsNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      fakeStore: {
        usersToPay: [
          {
            name: 'Lilia Bouvet',
            avatar: '/assets/images/default-avatar.png',
            status: 'todo',
            amount: 10
          },
          {
            name: 'Charlotte Doherty',
            avatar: '/assets/images/default-avatar.png',
            status: 'todo',
            amount: 20
          },
          {
            name: 'Kim Kr',
            avatar: '/assets/images/default-avatar.png',
            status: 'rejected',
            amount: 25
          },
          {
            name: 'Zoe Kim',
            avatar: '/assets/images/default-avatar.png',
            status: 'pending',
            amount: 30
          },
          {
            name: 'Hugo Lil',
            avatar: '/assets/images/default-avatar.png',
            status: 'completed',
            amount: 50
          }
        ]
      }
    }
  },
  methods: {
    // TEMP
    thisMonth () {
      return this.monthsNames[new Date().getMonth()]
    },
    statusIsSent (user) {
      return ['completed', 'pending'].includes(user.status)
    },
    statusIsCompleted (user) {
      return user.status === 'completed'
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings'
    ]),
    currency () {
      return currencies[this.groupSettings.mincomeCurrency].symbol
    },
    paymentSummary () {
      const { sent, confirmed, amoutSent, amountTotal, paymentsTotal } = this.paymentStatus

      return [
        {
          title: this.L('Payments completed'),
          value: sent,
          max: paymentsTotal,
          hasMarks: true,
          label: this.L('{value} out of {max}', {
            value: sent,
            max: paymentsTotal
          })
        },
        {
          title: this.L('Amout sent'),
          value: amoutSent,
          max: amountTotal,
          hasMarks: false,
          label: this.L('{value} of {max}', {
            value: `${this.currency}${amoutSent}`,
            max: `${this.currency}${amountTotal}`
          })
        },
        {
          title: this.L('Payments received'),
          value: confirmed,
          max: paymentsTotal,
          hasMarks: true,
          label: this.L('{value} of {max}', {
            value: confirmed,
            max: paymentsTotal
          })
        }
      ]
    },
    paymentStatus () {
      const { usersToPay } = this.fakeStore

      return {
        month: 'July',
        paymentsTotal: usersToPay.length,
        sent: usersToPay.reduce((acc, user) => this.statusIsSent(user) ? acc + 1 : acc, 0),
        confirmed: usersToPay.reduce((acc, user) => this.statusIsCompleted(user) ? acc + 1 : acc, 0),
        amoutSent: usersToPay.reduce((acc, user) => this.statusIsSent(user) ? acc + user.amount : acc, 0),
        amountTotal: usersToPay.reduce((acc, user) => acc + user.amount, 0)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-summary {
  &-title {
    margin-bottom: 1.75rem;
    margin-top: -0.25rem;
  }
  &-item {
    margin-bottom: $spacer*3;

    .label {
      margin-bottom: $spacer-xs;
    }

    .icon-check {
      margin-right: $spacer-sm;
    }
  }
}

.c-progress {
  margin: $spacer-xs 0;
}
</style>
