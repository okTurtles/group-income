<template>
  <main>
    <div class="section is-hero">
      <h1 class="title is-1 is-marginless">
        <i18n>Pay Group</i18n>
      </h1>
      <p><i18n>What’s this page about, so the user understands the context.</i18n></p>
    </div>

    <section class="section columns is-multiline c-invoice">
      <header class="box column is-narrow is-flex-mobile gi-is-justify-between c-summary">
        <div class="c-summary-item">
          <h2 class="is-size-7 has-text-grey is-uppercase"><i18n>Payments Sent</i18n></h2>
          <p class="title is-5">0 of 4</p>
        </div>
        <div class="c-summary-item">
          <h2 class="is-size-7 has-text-grey is-uppercase"><i18n>Payments Confirmed</i18n></h2>
          <p class="title is-5">0 of 4</p>
        </div>
        <div class="c-summary-item">
          <h2 class="is-size-7 has-text-grey is-uppercase"><i18n>Amount Payed</i18n></h2>
          <p class="title is-5">$0 of $100</p>
        </div>
        <span class="c-summary-progress">
          <span class="c-summary-progress-filled" style="width: 10%;"></span>
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
                $100
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
                <button class="button is-primary is-compact c-tableBox-cell"><i18n>Mark as payed</i18n></button>
              </td>
              <td class="is-size-5 is-numeric">
                {{user.value}}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="section" style="display: none;">
      <div class="columns is-multiline">
        <div class="column is-half">
          <p class="title is-4"><i18n>Set Monthly Contribution</i18n></p>
          <div class="box">
            <p>Mincome: <b>${{minCome}}</b></p>
            <p>Amount the group received this month: <b>${{amountReceivedThisMonth}}</b></p>
          </div>
          <div class="box">
            <p>
              Contribution Amount:
              <input id="contributionAmount" class="input" type="text" placeholder="0">
            </p>
            <p class="select">
              <select data-vv-rules="required" name="contributionCurrency">
                <option value="usd" selected>USD</option>
                <option value="btc">BTC</option>
              </select>
            </p>
          </div>
        </div>

        <div class="column is-half">
          <p class="title is-4"><i18n>Optional Contribution Info</i18n></p>
          <div class="box">
            <p>
              Monthly Income:
              <input id="monthlyIncome" class="input" type="text" placeholder="0">
            </p>
            <p>
              Other info:
              <textarea id="otherInfo" class="textarea"></textarea>
            </p>
          </div>

          <div class="has-text-centered button-box">
            <button class="button is-success is-large" type="submit"><i18n>Set Contribution</i18n></button>
          </div>
        </div>
      </div>
    </section>

  </main>
</template>
<style lang="scss" scoped>
@import "../assets/sass/theme/index";

.c-invoice {
  align-items: flex-start;
}

.c-tableBox {
  padding-top: 0;
  padding-bottom: 0;

  &-cell {
    display: inline-block;
    margin-right: $gi-spacer;
  }

  td {
    padding-left: 0;
    padding-right: 0;
  }

  tfoot td,
  tfoot th {
    padding: $gi-spacer 0;
  }

  tbody tr {
    &:first-child td {
      padding-top: $gi-spacer;
    }

    &:last-child td {
      padding-top: $gi-spacer;
    }
  }
}

.c-summary {
  position: relative;
  border-bottom-width: 0;

  &-item {
    margin: 0 $gi-spacer 0;

    &:last-of-type {
      margin-bottom: $gi-spacer-xs; // makeup progress bar height

      @include tablet {
        margin-right: 0;
        text-align: right;
      }
    }
  }

  &-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: $gi-spacer-xs;
    background-color: $primary-bg-a;
    box-shadow: inset 0 0 1px $primary;

    &-filled {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background-color: $primary;
    }
  }

  @include tablet {
    display: block;
    margin-left: $gi-spacer-lg;
    width: 12rem;
    order: 1;

    &-item {
      margin: 0 0 $gi-spacer;
    }
  }
}
</style>
<script>
import Avatar from './components/Avatar.vue'

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
          status: 0,
          value: '$10'
        },
        {
          name: 'Charlotte Doherty',
          avatar: 'http://localhost:8000/simple/assets/images/default-avatar.png',
          status: 0,
          value: '$20'
        },
        {
          name: 'Zoe Kim',
          avatar: 'http://localhost:8000/simple/assets/images/default-avatar.png',
          status: 0,
          value: '$30'
        },
        {
          name: 'Hugo Lil',
          avatar: 'http://localhost:8000/simple/assets/images/default-avatar.png',
          status: 0,
          value: '$50'
        }
      ]
    }
  }
}
</script>
