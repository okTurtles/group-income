<template>
  <main>
    <div class="section is-hero">
      <i18n tag="h1" class="title is-1 is-marginless">
        Pay Group
      </i18n>
      <i18n tag="p">What’s this page about, so the user understands the context.</i18n>
    </div>

    <section class="section columns is-desktop is-multiline c-invoice">
      <header class="box column is-narrow is-flex-touch gi-is-justify-between c-summary">
        <div class="c-summary-item">
          <h2 class="subtitle"><i18n>Payments Sent</i18n></h2>
          <p class="title is-5">
            <i18n :args="{ sent: paymentSummary.sent, total: fakeStore.users.length }">
              {sent} of {total}
            </i18n>

            <tooltip v-if="paymentSummary.hasWarning">
              <i class="fa fa-exclamation-triangle has-text-warning is-size-6 c-icon-badge"></i>

              <template slot="tooltip">
                <strong class="has-text-weight-bold">Payment Declined</strong>
                <i18n tag="p" class="has-text-weight-normal">
                  Someone didn’t confirm your payment. Please mark as payed only when it’s done.
                </i18n>
              </template>
            </tooltip>
          </p>
        </div>
        <div class="c-summary-item">
          <i18n  tag="h2" class="subtitle">Payments Confirmed</i18n>
          <i18n tag="p" class="title is-5" :args="{ sent: paymentSummary.confirmed, total: fakeStore.users.length }">
            {sent} of {total}
          </i18n>
        </div>
        <div class="c-summary-item">
          <i18n tag="h2" class="subtitle">Amount Sent</i18n>
          <p class="title is-5" :class="{'has-text-success': paymentAllDone}">
            <i18n v-if="paymentAllDone" :args="{ currency: fakeStore.currency, amountTotal: paymentSummary.amountTotal }">
              All {currency}{amountTotal}
            </i18n>
            <i18n v-else :args="{ currency: fakeStore.currency, amoutPayed:paymentSummary.amoutPayed, amountTotal: paymentSummary.amountTotal }">
              {currency}{amoutPayed} of {currency}{amountTotal}
            </i18n>
          </p>
        </div>
        <progress-bar :primary="paymentProgress.sent" :secondary="paymentProgress.confirmed"></progress-bar>
      </header>

      <div class="box column c-tableBox">
        <table class="table is-fullwidth is-vertical-middle">
          <thead class="sr-only">
            <tr>
              <i18n tag="th">Name</i18n>
              <i18n tag="th">Payment Status</i18n>
              <i18n tag="th">Amount</i18n>
            </tr>
          </thead>

          <tfoot>
            <tr>
              <i18n tag="th" colspan="2" class="is-size-5 c-tableBox-cell">
                Total
              </i18n>
              <td class="is-size-5 has-text-weight-bold is-numeric">
                {{fakeStore.currency}}{{paymentSummary.amountTotal}}
              </td>
            </tr>
          </tfoot>

          <tbody class="tbody is-borderless">
            <tr v-for="user, index in fakeStore.users">
              <th class="has-text-weight-normal">
                <avatar :alt="`${user.name}s avatar`" :src="user.avatar" size="lg" hasMargin></avatar>
                <span class="c-tableBox-cell">{{user.name}}</span>
              </th>
              <td>
                <div class="is-flex c-status" v-if="statusIsToPay(user)">
                  <i18n tag="button" class="button is-primary is-compact c-tableBox-cell"
                    @click="markAsPayed(user)"
                  >
                    Mark as paid
                  </i18n>

                  <tooltip direction="right-start" v-if="statusIsRejected(user)">
                    <i class="fa fa-exclamation-triangle has-text-warning is-size-6 c-icon-badge"></i>

                    <template slot="tooltip">
                      <strong class="has-text-weight-bold">Payment Declined</strong>
                      <i18n tag="p" class="has-text-weight-normal" :args="{ name: 'bob' }">
                        {name} didn’t confirm your payment. Please mark as payed only when it’s done.
                      </i18n>
                    </template>
                  </tooltip>
                </div>

                <div class="is-flex c-status" v-else-if="statusIsPending(user)">
                  <i class="fa fa-paper-plane c-status-icon"></i>
                  <p>
                    <i18n :args="{ name: getUserFirstName(user.name), admiration: getCustomAdmiration(index) }" class="has-text-text-light">
                      {admiration}! Waiting for {name} confirmation.
                    </i18n>
                    <i18n tag="button" class="gi-is-unstyled gi-is-link" @click="cancelPayment(user)">
                      Cancel payment
                    </i18n>
                  </p>
                </div>

                <div class="is-flex has-text-success has-text-weight-bold c-status" v-else-if="statusIsCompleted(user)">
                  <i class="fa fa-check-circle is-size-5 c-status-icon"></i>
                  <i18n>Payment sent!</i18n>
                </div>
              </td>
              <td class="is-size-5 is-numeric">
                {{fakeStore.currency}}{{user.amount}}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
<style lang="scss" scoped>
@import "../assets/sass/theme/index";

.c-invoice {
  align-items: flex-start;
}

.c-summary {
  position: relative;
  border-bottom-width: 0;

  &-item {
    margin: 0 $gi-spacer 0;

    &:last-of-type {
      margin-bottom: $gi-spacer-xs; // makeup progress bar height

      @include touch {
        margin-right: 0;
        text-align: right;
      }
    }
  }

  @include desktop {
    display: block;
    margin-left: $gi-spacer-lg;
    width: 12rem;
    order: 1;

    &-item {
      margin: 0 0 $gi-spacer;
    }
  }
}

.c-tableBox {
  padding-top: 0;
  padding-bottom: 0;

  td {
    padding-left: 0;
    padding-right: 0;

    // OPTIMIZE: wild selector, watch out its usage
    > *:last-child {
      margin-right: $gi-spacer;
    }
  }

  tfoot td,
  tfoot th {
    padding: $gi-spacer 0;
  }

  // user name
  th:first-child {
    width: 12rem;
  }

  tbody tr {
    &:first-child {
      th,
      td {
        padding-top: $gi-spacer;
      }
    }

    &:last-child {
      th,
      td {
        padding-bottom: $gi-spacer;
      }
    }
  }
}

.c-status {
  align-items: center;

  &-icon {
    margin-right: $gi-spacer;
  }
}

.c-icon-badge {
  margin-left: $gi-spacer/2;
}

</style>
<script>
import Avatar from './components/Avatar.vue'
import ProgressBar from './components/Graphs/Progress.vue'
import { toPercent } from './utils/filters.js'
import currencies from './utils/currencies.js'
import Tooltip from './components/Tooltip.vue'

export default {
  name: 'PayGroup',
  components: {
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
            avatar: '/simple/assets/images/default-avatar.png',
            status: 'todo',
            amount: 10
          },
          {
            name: 'Charlotte Doherty',
            avatar: '/simple/assets/images/default-avatar.png',
            status: 'todo',
            amount: 20
          },
          {
            name: 'Kim Kr',
            avatar: '/simple/assets/images/default-avatar.png',
            status: 'rejected',
            amount: 25
          },
          {
            name: 'Zoe Kim',
            avatar: '/simple/assets/images/default-avatar.png',
            status: 'pending',
            amount: 30
          },
          {
            name: 'Hugo Lil',
            avatar: '/simple/assets/images/default-avatar.png',
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
