<template lang="pug">
page(pageTestName='payGroupPage' pageTestHeaderName='payGroupTitle')
  template(#title='') Pay Group

  template(#sidebar='')
    h2.subtitle
      i18n Payments Sent

    h3
      i18n(
        :args='{ sent: paymentSummary.sent, total: fakeStore.users.length }'
      ) {sent} of {total}&nbsp;

      tooltip(v-if='paymentSummary.hasWarning')
        i.icon-exclamation-triangle

        template(slot='tooltip')
          strong Payment Declined
          i18n(tag='p')
            | Someone didn&rsquo;t confirm your payment. Please mark as payed only when it&rsquo;s done.

    h2.subtitle
      i18n Payments Confirmed

    h3
      i18n(:args='{ sent: paymentSummary.confirmed, total: fakeStore.users.length }')
        | {sent} of {total}

    h2.subtitle
      i18n Amount Sent

    h3(:class="{'has-text-success': paymentAllDone}")
      i18n(
        v-if='paymentAllDone'
        :args='{ currency: fakeStore.currency, amountTotal: paymentSummary.amountTotal }'
      ) All {currency}{amountTotal}

      i18n(
        v-else=''
        :args='{ currency: fakeStore.currency, amoutPayed:paymentSummary.amoutPayed, amountTotal: paymentSummary.amountTotal }'
      ) {currency}{amoutPayed} of {currency}{amountTotal}

      progress-bar(
        :primary='paymentProgress.sent'
        :secondary='paymentProgress.confirmed'
      )
    p
      i18n What's this page about, so the user understands the context.

  .card
    table.c-table
      thead.sr-only
        tr
          i18n(tag='th') Name
          i18n(tag='th') Payment Status
          i18n(tag='th') Amount

      tfoot
        tr
          i18n.c-table-cell(tag='th' colspan='2')
            | Total
          td
            | {{fakeStore.currency}}{{paymentSummary.amountTotal}}

      tbody
        tr(
          v-for='(user, index) in fakeStore.users'
          :key='user.name'
        )
          th
            avatar(
              :src='user.avatar'
              :alt='L("{username}\'s avatar", { username: user.name} )')

            span.c-table-cell {{user.name}}

          td
            .c-status(v-if='statusIsToPay(user)')
              i18n.button.is-small.c-table-cell(
                tag='button'
                @click='markAsPayed(user)'
              ) Mark as paid

              tooltip(
                v-if='statusIsRejected(user)'
                direction='right-start'
              )
                i.icon-exclamation-triangle.has-text-warning.is-size-6.c-icon-badge

                template(slot='tooltip')
                  strong.has-text-weight-bold Payment Declined
                  i18n.has-text-weight-normal(
                    tag='p'
                    :args="{ name: 'bob' }"
                  ) {name} didn&rsquo;t confirm your payment. Please mark as payed only when it&rsquo;s done.

            .c-status(v-else-if='statusIsPending(user)')
              i.icon-paper-plane.c-status-icon
              p
                i18n.has-text-1(:args='{ name: getUserFirstName(user.name), admiration: getCustomAdmiration(index) }')
                  | {admiration}! Waiting for {name} confirmation.&nbsp;
                i18n.is-unstyled.link(tag='button' @click='cancelPayment(user)')
                  | Cancel payment

            .has-text-success.c-status(v-else-if='statusIsCompleted(user)')
              i.icon-check-circle.is-size-5.c-status-icon
              i18n Payment sent!

          td
            | {{fakeStore.currency}}{{user.amount}}
</template>

<script>
import Page from '@pages/Page.vue'
import Avatar from '@components/Avatar.vue'
import ProgressBar from '@components/Graphs/Progress.vue'
import { toPercent } from '@view-utils/filters.js'
import currencies from '@view-utils/currencies.js'
import Tooltip from '@components/Tooltip.vue'

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
      ephemeral: {
        admirations: {
          types: [this.L('Awesome'), this.L('Cool'), this.L('Great'), this.L('Nice'), this.L('Super'), this.L('Sweet')],
          users: [] /* ['admiration'] */
        }
      },
      fakeStore: {
        users: [
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
    paymentSummary () {
      const { users } = this.fakeStore
      return {
        sent: users.reduce((acc, user) => this.statusIsPayed(user) ? acc + 1 : acc, 0),
        confirmed: users.reduce((acc, user) => this.statusIsCompleted(user) ? acc + 1 : acc, 0),
        amoutPayed: users.reduce((acc, user) => this.statusIsPayed(user) ? acc + user.amount : acc, 0),
        amountTotal: users.reduce((acc, user) => acc + user.amount, 0),
        hasWarning: users.filter(user => this.statusIsRejected(user)).length > 0
      }
    },
    paymentProgress () {
      const { sent, confirmed } = this.paymentSummary
      const usersLength = this.fakeStore.users.length

      return {
        sent: toPercent(sent / usersLength),
        confirmed: toPercent(confirmed / usersLength)
      }
    },
    paymentAllDone () {
      return this.paymentSummary.confirmed === this.fakeStore.users.length
    }
  },
  methods: {
    statusIsToPay (user) {
      return ['todo', 'rejected'].includes(user.status)
    },
    statusIsPayed (user) {
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
    getCustomAdmiration (index) {
      const { admirations } = this.ephemeral

      if (!admirations.users[index]) {
        admirations.users[index] = admirations.types[Math.floor(Math.random() * admirations.types.length)]
      }
      return admirations.users[index]
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
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-invoice {
  align-items: flex-start;
}

.c-summary {
  position: relative;
  border-bottom-width: 0;

  &-item {
    margin: 0 $spacer 0;

    &:last-of-type {
      margin-bottom: $spacer-xs; // makeup progress bar height

      @include touch {
        margin-right: 0;
        text-align: right;
      }
    }
  }

  @include desktop {
    display: block;
    margin-left: $spacer-lg;
    width: 12rem;
    order: 1;

    &-item {
      margin: 0 0 $spacer;
    }
  }
}

.c-status {
  align-items: center;

  &-icon {
    margin-right: $spacer;
  }
}

.c-icon-badge {
  margin-left: $spacer/2;
}

.c-table {
  border-spacing: 2rem;
  margin: 0 -2rem;
  border-collapse: initial;
}

tr {
  vertical-align: middle;

  p {
    display: inline;
  }
}

th {
  white-space: nowrap;
}

.c-avatar {
  width: 2rem;
  margin-right: 1rem;
  display: inline-block;
  margin-bottom: -0.7rem;
}

</style>
