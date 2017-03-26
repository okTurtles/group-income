<template>
  <!-- main containers:
   .container  http://bulma.io/documentation/layout/container/
   .content    http://bulma.io/documentation/elements/content/
   .section    http://bulma.io/documentation/layout/section/
   .block      base/classes.sass (just adds 20px margin-bottom except for last)
   -->
  <section class="section">
    <div class="columns">
      <div class="column is-1"></div>
      <div class="column is-10" >

        <div class="columns is-multiline">
          <div class="column is-half">
            <p class="title is-4"><i18n>{{ msg }}</i18n></p>
            <div class="box">
              <p>Mincome: <b>${{ minCome }}</b></p>
              <p>Amount the group received this month: <b>${{ amountReceivedThisMonth }}</b></p>
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

      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'PayGroup',
  props: {
    minCome: {type: Number, default: 1000},
    amountReceivedThisMonth: {type: Number, default: 852}
  },
  data () {
    return {
      // note: changing this line won't causes changes
      // with hot-reload because the reloaded component
      // preserves its current state and we are modifying
      // its initial state.
      msg: 'Set Monthly Contribution'
    }
  }
}
</script>
