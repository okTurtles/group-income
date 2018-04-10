<template>
  <section class="section">
    <!-- main containers:
     .container  http://bulma.io/documentation/layout/container/
     .content    http://bulma.io/documentation/elements/content/
     .section    http://bulma.io/documentation/layout/section/
     .block      base/classes.sass (just adds 20px margin-bottom except for last)
     -->
    <div class="container">
      <div class="columns">
        <div class="column"></div>
        <div class="column is-10">
          <h2 class="subtitle">Sign Up</h2>

          <div class="control is-horizontal">
            <div class="control is-grouped">
              <input class="input" name="name" placeholder="Name">
              <input class="input" name="email" placeholder="Email">
              <input class="input" name="password" placeholder="Password" type="password">
            </div>
          </div>

          <p class="control">
            <input class="input" name="phone" placeholder="555-555-5555">
          </p>
          <label class="label" for="phone">Phone number</label>
          <h2 class="subtitle">Payment Information</h2>
          <input class="input" name="payVenmo" placeholder="@your_venmo_account">
          <label class="label" for="email"><img class="venmo" src="images/venmo.png" alt="venmo"> account</label>
          <input class="input" name="payBitcoin" placeholder="0000000000000000000000000000000000">
          <label class="label" for="email"><img class="venmo" src="images/bitcoin.png" alt="Bitcoin"> address</label>
          <input class="input" name="payPaypal" placeholder="email@domain.com">
          <label class="label" for="email"><img class="venmo" src="images/paypal.png" alt="PayPal"> (IF DIFFERENT THAN EMAIL)</label>
          <input class="input" name="payInstructions">
          <label class="label" for="payment_notes">Additional payment instructions</label>
          <h2 class="subtitle">Contribution limits</h2>
          <label class="label" for="contriGL">Giving Limit</label>
          <p class="control has-icon">
            <input class="input" name="contriGL" placeholder="0" value="0">
            <i class="fa fa-dollar"></i>
          </p>
          <label class="label" for="contriRL">Receiving Limit</label>
          <p class="control has-icon">
            <input class="input" name="contriRL" placeholder="0" value="0">
            <i class="fa fa-dollar"></i>
          </p>
          <button class="button is-success" @click.prevent="submit">Sign Up</button>
          <div id="response" :class="responseClass">{{ response }}</div>
        </div>
        <div class="column"></div>
      </div>
    </div>
  </section>
</template>
<script>
export default {
  data () {
    return {
      // note: changing this line won't causes changes
      // with hot-reload because the reloaded component
      // preserves its current state and we are modifying
      // its initial state.
      msg: 'New Profile!'
    }
  }
}
</script>
