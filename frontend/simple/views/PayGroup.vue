<template>
  <main>
    <div class="section is-hero">
      <h1 class="title is-1 is-marginless">
        <i18n>Pay Group</i18n>
      </h1>
      <p><i18n>What’s this page about, so the user understands the context.</i18n></p>
    </div>

    <section class="section columns is-desktop is-multiline c-invoice">
      <header class="box column is-narrow is-flex-touch gi-is-justify-between c-summary">
        <div class="c-summary-item">
          <h2 class="is-size-7 has-text-grey is-uppercase"><i18n>Payments Sent</i18n></h2>
          <p class="title is-5">
            {{paymentSummary.sent}} <i18n>of</i18n> {{users.length}}
            <i class="fa fa-exclamation-triangle has-text-warning is-size-6 c-summary-tip"
              v-if="paymentSummary.hasWarning"></i>
          </p>
        </div>
        <div class="c-summary-item">
          <h2 class="is-size-7 has-text-grey is-uppercase"><i18n>Payments Confirmed</i18n></h2>
          <p class="title is-5">{{paymentSummary.confirmed}} <i18n>of</i18n> {{users.length}}</p>
        </div>
        <div class="c-summary-item">
          <h2 class="is-size-7 has-text-grey is-uppercase"><i18n>Amount Sent</i18n></h2>
          <p class="title is-5" :class="{'has-text-success': paymentAllDone}">
            <template v-if="paymentAllDone">
              All {{currency}}{{paymentSummary.amountTotal}}
            </template>
            <template v-else>
              {{currency}}{{paymentSummary.amoutPayed}} <i18n>of</i18n> {{currency}}{{paymentSummary.amountTotal}}
            </template>
          </p>
        </div>
        <span class="c-summary-progress">
          <span class="c-summary-progress-sent" :style="paymentProgressStyles.sent"></span>
          <span class="c-summary-progress-confirmed" :style="paymentProgressStyles.confirmed"></span>
        </span>
      </header>

      <div class="box column c-tableBox">
        <table class="table is-fullwidth is-vertical-middle">
          <thead class="sr-only">
            <tr>
              <th><i18n>Name</i18n></th>
              <th><i18n>Payment Status</i18n></th>
              <th><i18n>Amount</i18n></th>
            </tr>
          </thead>

          <tfoot>
            <tr>
              <td colspan="2">
                <i18n class="is-size-5 c-tableBox-cell">Total</i18n>
              </td>
              <td class="is-size-5 has-text-weight-bold is-numeric">
                {{currency}}{{paymentSummary.amountTotal}}
              </td>
            </tr>
          </tfoot>

          <tbody class="tbody is-borderless">
            <tr v-for="user in users">
              <td>
                <avatar :alt="`${user.name}s avatar`" :src="user.avatar"></avatar>
                <span class="c-tableBox-cell">{{user.name}}</span>
              </td>
              <td>
                <div class="is-flex c-status"
                  v-if="['todo', 'rejected'].includes(user.status)"
                >
                  <button class="button is-primary is-compact c-tableBox-cell"
                    @click="markAsPayed(user)"
                  >
                    <i18n>Mark as payed</i18n>
                  </button>

                  <i class="fa fa-exclamation-triangle has-text-warning is-size-6 c-status-tip"
                    v-if="user.status === 'rejected'"></i>
                </div>

                <div class="is-flex c-status"
                  v-else-if="user.status === 'pending'">
                  <i class="fa fa-paper-plane c-status-icon"></i>
                  <p>
                    <i18n>Awesome! Waiting for [user] confirmation.</i18n>
                    <button class="gi-is-unstyled gi-is-link" @click="revertPayment(user)">
                      <i18n>Cancel payment</i18n>
                    </button>
                  </p>
                </div>

                <div class="is-flex has-text-success has-text-weight-bold c-status"
                  v-else-if="user.status === 'completed'"
                >
                  <i class="fa fa-check-circle is-size-5 c-status-icon"></i>
                  <i18n>Payment sent!</i18n>
                </div>
              </td>
              <td class="is-size-5 is-numeric">
                {{currency}}{{user.value}}
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

  &-tip {
    margin-left: $gi-spacer-sm;
  }

  &-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: $gi-spacer-xs;
    background-color: $primary-bg-a;
    box-shadow: inset 0 0 1px $primary;

    &-sent,
    &-confirmed {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background-color: $primary;
      // Animation to scale up the progress bars
      transition: width 250ms ease-in-out;
      transform: scaleX(0);
      transform-origin: 0 0;
    }

    &-sent {
      background-color: $primary;
      // this one is slowers: starts sooner and ends later.
      animation: progress 700ms ease-in-out 450ms forwards;
    }

    &-confirmed {
      background-color: $success;
      animation: progress 500ms ease-in-out 550ms forwards;
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

@keyframes progress {
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}

.c-tableBox {
  padding-top: 0;
  padding-bottom: 0;

  td {
    padding-left: 0;
    padding-right: 0;

    // REVIEW: wild selector, avoid it
    > *:last-child {
      margin-right: $gi-spacer;
    }
  }

  tfoot td,
  tfoot th {
    padding: $gi-spacer 0;
  }

  // user name
  td:first-child {
    width: 12rem;
  }

  tbody tr {
    &:first-child td {
      padding-top: $gi-spacer;
    }

    &:last-child td {
      padding-bottom: $gi-spacer;
    }
  }
}

.c-status {
  align-items: center;

  &-icon {
    margin-right: $gi-spacer;
  }

  &-tip {
    margin-left: $gi-spacer;
  }
}
</style>
<script>
import Avatar from './components/Avatar.vue'
import { toPercent } from './utils/filters.js'

export default {
  name: 'PayGroup',
  props: {
    minCome: {type: Number, default: 1000},
    amountReceivedThisMonth: {type: Number, default: 852}
  },
  components: {
    Avatar
  },
  data () {
    return {
      users: [
        {
          name: 'Lilia Bouvet',
          avatar: 'http://localhost:8000/simple/assets/images/default-avatar.png',
          status: 'todo',
          value: 10
        },
        {
          name: 'Charlotte Doherty',
          avatar: 'http://localhost:8000/simple/assets/images/default-avatar.png',
          status: 'todo',
          value: 20
        },
        {
          name: 'Kim Kr',
          avatar: 'http://localhost:8000/simple/assets/images/default-avatar.png',
          status: 'rejected',
          value: 25
        },
        {
          name: 'Zoe Kim',
          avatar: 'http://localhost:8000/simple/assets/images/default-avatar.png',
          status: 'pending',
          value: 30
        },
        {
          name: 'Hugo Lil',
          avatar: 'http://localhost:8000/simple/assets/images/default-avatar.png',
          status: 'completed',
          value: 50
        }
      ],
      currency: '$'
    }
  },
  computed: {
    paymentSummary () {
      return {
        sent: this.users.reduce((acc, user) =>
          ['completed', 'pending'].includes(user.status) ? acc + 1 : acc, 0),
        hasWarning: this.users.filter(user => user.status === 'rejected').length > 0,
        confirmed: this.users.reduce((acc, user) =>
          ['completed'].includes(user.status) ? acc + 1 : acc, 0),
        amoutPayed: this.users.reduce((acc, user) =>
          ['completed', 'pending'].includes(user.status) ? acc + user.value : acc, 0),
        amountTotal: this.users.reduce((acc, user) => acc + user.value, 0)
      }
    },
    paymentProgressStyles () {
      const { sent, confirmed } = this.paymentSummary
      const usersLength = this.users.length

      return {
        sent: { width: toPercent(sent / usersLength) },
        confirmed: { width: toPercent(confirmed / usersLength) }
      }
    },
    paymentAllDone () {
      return this.paymentSummary.confirmed === this.users.length
    }
  },
  methods: {
    markAsPayed (user) {
      console.log('TODO - mark as payed')
      // Raw Logic
      user.status = 'pending'
    },
    revertPayment (user) {
      console.log('TODO - cancel payment')
      // Raw Logic
      user.status = 'todo'
    }
  }
}
</script>
