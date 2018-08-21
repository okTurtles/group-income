<template>
  <main>
    <div class="section is-hero">
      <h1 class="title is-1 is-marginless">
        <i18n>Pay Group</i18n>
      </h1>
      <p><i18n>What’s this page about, so the user understands the context.</i18n></p>
    </div>

    <div class="section columns is-multiline">
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

      <section class="box column">
        <list-item>
          <avatar alt="x" src="" size="sm"></avatar>
          <span>Lilia Bouvet</span>
          <button class="primary"><i18n>Mark as payed</i18n></button>
          <span>$10</span>
        </list-item>

        <div class="level gi-is-justify-between">
          <i18n class="is-5">Total</i18n>
          <strong class="is-5 has-text-weight-bold">$100</strong>
        </div>
      </section>
    </div>

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

.c-summary {
  position: relative;
  border-bottom-width: 0;

  &-item {
    margin: 0 $gi-spacer 0;

    &:last-of-type {
      margin-bottom: $gi-spacer-xs; // makeup progress bar height

      @include mobile {
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
export default {
  name: 'PayGroup',
  props: {
    minCome: {type: Number, default: 1000},
    amountReceivedThisMonth: {type: Number, default: 852}
  },
  data () {
    return {}
  }
}
</script>
