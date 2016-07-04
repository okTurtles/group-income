<template>
  <section class="section">
    <!-- main containers:
     .container  http://bulma.io/documentation/layout/container/
     .content    http://bulma.io/documentation/elements/content/
     .section    http://bulma.io/documentation/layout/section/
     .block      base/classes.sass (just adds 20px margin-bottom except for last)
     -->
    <div class="new-user-container">
      <div class="icon"></div>
      <form class="new-user" v-el:form>
        <h2>Personal details</h2>
        <input class="text-input" name="name" placeholder="Your full name">
        <label for="name">Your name</label>
        <input class="text-input" name="email" placeholder="email@domain.com">
        <label for="email">Email address</label>
        <input class="text-input" name="password" placeholder="" type="password">
        <label for="password">Password</label>
        <input class="text-input" name="phone" placeholder="555-555-5555">
        <label for="phone">Phone number</label>
        <h2 class="contribution-limits">Payment Information</h2>
        <input class="text-input" name="payVenmo" placeholder="@your_venmo_account">
        <label for="email"><img class="venmo" src="images/venmo.png" alt="venmo"> account</label>
        <input class="text-input" name="payBitcoin" placeholder="0000000000000000000000000000000000">
        <label for="email"><img class="venmo" src="images/bitcoin.png" alt="Bitcoin"> address</label>
        <input class="text-input" name="payPaypal" placeholder="email@domain.com">
        <label for="email"><img class="venmo" src="images/paypal.png" alt="PayPal"> (IF DIFFERENT THAN EMAIL)</label>
        <input class="text-input" name="payInstructions">
        <label for="payment_notes">Additional payment instructions</label>
        <h2 class="contribution-limits">Contribution limits</h2>
        <input class="text-input contribution-limit" name="contriGL" placeholder="0" value="0">
        <label for="contriGL">Giving Limit <span class="dollar-label">$</span></label>
        <input class="text-input contribution-limit" name="contriRL" placeholder="0" value="0">
        <label for="contriRL">Receiving Limit <span class="dollar-label">$</span></label>
        <button class="sign-in btn" @click.prevent="submit">Sign Up</button>
      </form>
      <div id="response" :class="responseClass">{{ response }}</div>
    </div>
  </section>
</template>

<style>
  /*these are globally applied. do like in SignUp.vue instead*/
  /*or set <style scoped> per: https://github.com/vuejs/vueify#scoped-css */
  /*#response.error {color:red;}*/
  /*#response {color:green;}*/
</style>

<script>
export default {
  name: 'UserProfileView',
  methods: {
    submit: function () {
      this.responseClass.error = true
      this.response = 'not implemented'
    }
  },
  data () {
    return {
      responseClass: {
        error: false
      },
      response: ''
    }
  }
}
</script>
