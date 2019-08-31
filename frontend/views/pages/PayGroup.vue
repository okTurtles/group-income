<template lang="pug">
page(
  pageTestName='payGroupPage'
  pageTestHeaderName='payGroupTitle'
)
  template(#title='') Pay Group

  template(#sidebar=''
    v-if='hasPayments'
  )
    .c-summary-item(
      v-for='(item, index) in paymentSummary'
      :key='index'
    )
      i18n.title.is-4(tag="h4") {{item.title}}
      progress-bar.c-progress(
        :max='item.max'
        :value='item.value'
        :hasMarks='item.hasMarks'
      )
      p(:class="{'has-text-success': item.max === item.value}")
        i.icon-check(v-if="item.max === item.value")
        i18n.has-text-1 {{item.label}}
  div(
    v-if='!hasPayments'
    class='c-container-empty'
  )
    | [SVG WIP]
    i18n.title.is-4(tag='h2') There are no pending payments yet!
    i18n(tag='p') Once other group members add their income details, Group Income will re-distribute wealth amongst everyone.

  .card(v-else)
    i18n.title.is-3(
      tag='h3'
      :args='{ month: "July" }'
    ) {month} contributions
    i18n(
      tag='p'
      :args='{ amount: "$60" }'
    ) {amount} in total

    ul.c-payments
      li.c-payments-item(
        v-for='(user, index) in fakeStore.usersToPay'
        :key='user.name'
      )
        .c-info
          avatar.c-avatar(:src='user.avatar')
          div(role="alert")
            i18n(
              tag="p"
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
              :args="{ name: getUserFirstName(user.name) }"
            ) The payment was not received by {name}.

        .c-ctas
          i18n.button.is-small.is-outlined(
            tag='button'
            key="message"
            v-if='statusIsRejected(user)'
          ) Send message...
          i18n.button.is-small.c-ctas-sent(
            tag='button'
            key="send"
            v-if='statusIsToPay(user)'
            @click='markAsPayed(user)'
          ) Mark as sent
          i18n.button.is-small.is-outlined(
            tag='button'
            key="cancel"
            v-if='statusIsPending(user)'
            @click='cancelPayment(user)'
          ) Cancel

  .footer
    i18n.button.is-small.is-outlined(
      tag='button'
      @click="seeHistory"
    ) See past contributions
</template>

<script>
import sbp from '~/shared/sbp.js'
import Page from '@pages/Page.vue'
import Avatar from '@components/Avatar.vue'
import ProgressBar from '@components/Graphs/Progress.vue'
import currencies from '@view-utils/currencies.js'
import Tooltip from '@components/Tooltip.vue'
import { LOAD_MODAL } from '@utils/events.js'

export default {
  name: 'PayGroup',
  components: {
    Page,
    Avatar,
    ProgressBar,
    Tooltip
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
        currency: currencies['USD']
      }
    }
  },
  computed: {
    hasPayments () {
      return this.fakeStore.usersToPay.length > 0
    },
    paymentSummary () {
      const { usersToPay, currency } = this.fakeStore
      const paymentsTotal = usersToPay.length
      const sent = usersToPay.reduce((acc, user) => this.statusIsSent(user) ? acc + 1 : acc, 0)
      const confirmed = usersToPay.reduce((acc, user) => this.statusIsCompleted(user) ? acc + 1 : acc, 0)
      const amoutSent = usersToPay.reduce((acc, user) => this.statusIsSent(user) ? acc + user.amount : acc, 0)
      const amountTotal = usersToPay.reduce((acc, user) => acc + user.amount, 0)

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
      sbp('okTurtles.events/emit', LOAD_MODAL, 'PayGroupHistory')
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
    padding: $spacer-xl $spacer $spacer;
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
  &-item {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    padding: $spacer $spacer-sm $spacer 0;
    border-bottom: 1px solid $general_1;
    min-height: 4.7rem; // aligned for when has 1 or 2 lines text.
  }

  .c-avatar {
    // REVIEW: without nesting it doesnt work
    min-width: 1.5rem;
    width: 1.5rem;
    margin-right: $spacer;

    @include tablet {
      min-width: 2.5rem;
      width: 2.5rem;
    }
  }
}

.c-info {
  display: flex;
  align-items: center;
  flex-grow: 1;
  margin-right: $spacer-sm;
}

.c-ctas {
  display: flex;
  margin: $spacer-sm 0;

  &-sent {
    margin-left: $spacer-sm;

    @include widescreen {
      margin-left: $spacer;
    }
  }
}

.footer {
  margin-top: $spacer-lg;
  text-align: center;
}

</style>
