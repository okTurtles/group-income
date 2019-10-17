<template lang='pug'>
page(
  pageTestName='payGroupPage'
  pageTestHeaderName='payGroupTitle'
)
  template(#title='') {{ L('Pay Group') }}

  template(#sidebar=''
    v-if='hasPayments'
  )
    .c-summary-item(
      v-for='(item, index) in paymentSummary'
      :key='index'
    )
      h4.title.is-4 {{item.title}}
      progress-bar.c-progress(
        :max='item.max'
        :value='item.value'
        :hasMarks='item.hasMarks'
      )
      p(:class='{"has-text-success": item.max === item.value}')
        i.icon-check(v-if='item.max === item.value')
        .has-text-1 {{item.label}}
  .c-container-empty(v-if='!hasPayments')
    svg-contributions.c-svg

    i18n.title.is-4(tag='h2') There are no pending payments yet!
    i18n.has-text-1(tag='p') Once other group members add their income details, Group Income will re-distribute wealth amongst everyone.

  div(v-else)
    .card
      i18n.title.is-3(
        tag='h3'
        :args='{ month: paymentStatus.month }'
      ) {month} contributions
      i18n.has-text-1(
        tag='p'
        :args='{ amount: `${fakeStore.currency}${paymentStatus.amountTotal}` }'
      ) {amount} in total

      ul.c-payments
        li.c-payments-item(
          v-for='(user, username) in usersToPay'
          :key='username'
        )
          .c-info
            user-image.c-avatar(:username='username')
            div(role='alert')
              i18n(
                tag='p'
                html='<b>{total}</b> to <b>{user}</b>'
                :args='{ total: user.amountPretty, user: username }'
              ) {total} to {user}
              //- i18n.has-text-1(
              //-   v-if='statusIsPending(user)'
              //-   :args='{ username }'
              //- ) Waiting for {username} confirmation...
              //- i18n.has-text-success(
              //-   v-if='statusIsCompleted(user)'
              //- ) Payment confirmed!
              //- i18n.has-text-weight-normal.has-text-warning(
              //-   v-if='statusIsRejected(user)'
              //-   :args='{ username }'
              //- ) The payment was not received by {username}.

          .buttons.is-start.c-ctas
            router-link.button.is-small.is-outlined(
              v-if='statusIsRejected(user)'
              to='messages/liliabt'
            ) {{ L('Send Message...') }}
            i18n.button.is-small.c-ctas-send(
              tag='button'
              key='send'
              v-if='statusIsToPay(user)'
              @click='markAsPayed(user)'
            ) Mark as sent
            i18n.button.is-small.is-outlined(
              tag='button'
              key='cancel'
              v-if='statusIsPending(user)'
              @click='cancelPayment(user)'
            ) Cancel

      ul.c-payments
        li.c-payments-item(
          v-for='(user, index) in fakeStore.usersToPay'
          :key='user.name'
        )
          .c-info
            avatar.c-avatar(:src='user.avatar')
            div(role='alert')
              i18n(
                tag='p'
                :args='{ total: `<b>${fakeStore.currency}${user.amount}</b>`, user: `<b>${user.name}</b>`}'
              ) {total} to {user}
              i18n.has-text-1(
                v-if='statusIsPending(user)'
                :args='{ name: getUserFirstName(user.name) }'
              ) Waiting for {name} confirmation...
              i18n.has-text-success(
                v-if='statusIsCompleted(user)'
              ) Payment confirmed!
              i18n.has-text-weight-normal.has-text-warning(
                v-if='statusIsRejected(user)'
                :args='{ name: getUserFirstName(user.name) }'
              ) The payment was not received by {name}.

          .buttons.is-start.c-ctas
            router-link.button.is-small.is-outlined(
              v-if='statusIsRejected(user)'
              to='messages/liliabt'
            ) {{ L('Send Message...') }}
            i18n.button.is-small.c-ctas-send(
              tag='button'
              key='send'
              v-if='statusIsToPay(user)'
              @click='markAsPayed(user)'
            ) Mark as sent
            i18n.button.is-small.is-outlined(
              tag='button'
              key='cancel'
              v-if='statusIsPending(user)'
              @click='cancelPayment(user)'
            ) Cancel

    .c-footer
      i18n.button.is-small.is-outlined(
        tag='button'
        @click='seeHistory'
      ) See past contributions
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import Page from '@pages/Page.vue'
import Avatar from '@components/Avatar.vue'
import UserImage from '@containers/UserImage.vue'
import ProgressBar from '@components/Graphs/Progress.vue'
import currencies from '@view-utils/currencies.js'
import Tooltip from '@components/Tooltip.vue'
import { OPEN_MODAL } from '@utils/events.js'
import SvgContributions from '@svgs/contributions.svg'
import incomeDistribution from '@utils/distribution/mincome-proportional.js'

export default {
  name: 'PayGroup',
  components: {
    Page,
    Avatar,
    UserImage,
    ProgressBar,
    Tooltip,
    SvgContributions
  },
  data () {
    return {
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
        ],
        currency: currencies.USD.symbol
      }
    }
  },
  computed: {
    ...mapGetters([
      'groupMembers',
      'groupSettings'
    ]),
    mincomeAmount () {
      return this.groupSettings.mincomeAmount
    },
    currency () {
      return currencies[this.groupSettings.mincomeCurrency]
    },
    ourUsername () {
      return this.$store.state.loggedIn.username
    },
    usersToPay () {
      const profiles = this.groupMembers
      const currentIncomeDistribution = []
      const usersWithIncomeDetails = Object.keys(profiles).reduce((acc, username) => {
        const profile = profiles[username]
        const incomeDetailsKey = profile && profile.groupProfile.incomeDetailsKey
        if (incomeDetailsKey) {
          acc[username] = profile
          const adjustment = incomeDetailsKey === 'incomeAmount' ? 0 : this.mincomeAmount
          const adjustedAmount = adjustment + profile.groupProfile[incomeDetailsKey]
          currentIncomeDistribution.push({ name: username, amount: adjustedAmount })
        }
        return acc
      }, {})
      const allPayments = incomeDistribution(currentIncomeDistribution, this.mincomeAmount)
      console.debug({ usersWithIncomeDetails, currentIncomeDistribution, allPayments })
      return allPayments.filter(p => p.from === this.ourUsername).reduce((acc, payment) => {
        acc[payment.to] = {
          ...usersWithIncomeDetails[payment.to],
          amount: +this.currency.displayWithoutCurrency(payment.amount),
          amountPretty: this.currency.displayWithCurrency(payment.amount)
        }
        return acc
      }, {})
    },
    hasPayments () {
      return this.fakeStore.usersToPay.length > 0
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
    },
    paymentSummary () {
      const { currency } = this.fakeStore
      const { sent, confirmed, amoutSent, amountTotal, paymentsTotal } = this.paymentStatus

      return [
        {
          title: this.L('Payments sent'),
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
            value: `${currency}${amoutSent}`,
            max: `${currency}${amountTotal}`
          })
        },
        {
          title: this.L('Payments confirmed'),
          value: confirmed,
          max: paymentsTotal,
          hasMarks: true,
          label: this.L('{value} of {max}', {
            value: confirmed,
            max: paymentsTotal
          })
        }
      ]
    }
  },
  methods: {
    statusIsToPay (user) {
      return ['todo', 'rejected'].includes(user.status)
    },
    statusIsSent (user) {
      return ['completed', 'pending'].includes(user.status)
    },
    statusIsPending (user) {
      return user.status === 'pending'
    },
    statusIsRejected (user) {
      return user.status === 'rejected'
    },
    statusIsCompleted (user) {
      return user.status === 'completed'
    },
    getUserFirstName (name) {
      return name.split(' ')[0]
    },
    markAsPayed (user) {
      console.log('TODO - mark as payed')
      // Raw Logic
      user.status = 'pending'
    },
    cancelPayment (user) {
      console.log('TODO - cancel payment')
      // Raw Logic
      user.status = 'todo'
    },
    seeHistory () {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'PayGroupHistory')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-container-empty {
  max-width: 25rem;
  margin: 0 auto;
  padding: $spacer-xl $spacer $spacer;
  text-align: center;

  .title {
    margin: $spacer;
  }

  .c-svg {
    display: inline-block;
    height: 9rem;
    margin-bottom: $spacer-lg;
  }
}

.c-summary-item {
  margin-bottom: $spacer*3;

  .icon-check {
    margin-right: $spacer-sm;
  }
}

.c-progress {
  margin: $spacer-sm 0;
}

.c-payments {
  margin-top: $spacer;
  &-item {
    padding: $spacer $spacer-sm;

    &:not(:last-child) {
      border-bottom: 1px solid $general_1;
    }

    @include tablet {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  .c-avatar {
    // REVIEW: without nesting it doesnt work
    min-width: 1.5rem;
    width: 1.5rem;
    margin-right: $spacer;
    margin-bottom: $spacer-sm;

    @include tablet {
      min-width: 2.5rem;
      width: 2.5rem;
    }
  }
}

.c-info {
  @include tablet {
    display: flex;
    align-items: center;
    margin-right: $spacer-sm;
  }

}

.c-ctas {
  margin-bottom: $spacer-sm;

  @include tablet {
    margin: 0;
    padding: 0;
  }
}

.c-footer {
  margin-top: $spacer-lg;
  text-align: center;
}

.c-sprite {
  display: none;
}

</style>
