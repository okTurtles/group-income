<template>
  <div class="user-profile">
    <h1>{{ msg }}</h1>
  </div>
  <div class="new-user-container">
    <div class="icon"></div>
    <div class="new-user">
      <h2>Personal details</h2>
      <input class="text-input" v-model="full_name" placeholder="Your full name">
      <label for="full_name">Your name</label>
      <input class="text-input" v-model="email" placeholder="email@domain.com">
      <label for="email">Email address</label>
      <input class="text-input" name="phone_number" placeholder="555-555-5555">
      <label for="phone_number">Phone number</label>
      <h2 class="contribution-limits">Payment Information</h2>
      <input class="text-input" name="venmo" placeholder="@your_venmo_account">
      <label for="email"><img class="venmo" src="/images/venmo.png" alt="venmo"> account</label>
      <input class="text-input" name="venmo" placeholder="0000000000000000000000000000000000">
      <label for="email"><img class="venmo" src="/images/bitcoin.png" alt="Bitcoin"> address</label>
      <input class="text-input" name="venmo" placeholder="email@domain.com">
      <label for="email"><img class="venmo" src="/images/paypal.png" alt="PayPal"> (IF DIFFERENT THAN EMAIL)</label>
      <input class="text-input" name="payment_notes">
      <label for="payment_notes">Additional payment instructions</label>
      <h2 class="contribution-limits">Contribution limits</h2>
      <input class="text-input contribution-limit" name="giving_limit" placeholder="0">
      <label for="giving_limit">Giving Limit <span class="dollar-label">$</span></label>
      <input class="text-input contribution-limit" name="receiving_limit" placeholder="0">
      <label for="receiving_limit">Receiving Limit <span class="dollar-label">$</span></label>
      <button class="sign-in btn" @click="submit">Sign Up</button>
    </div>
    <div id="response"></div>
</template>

<script>
var request = require('superagent')
// var $ = require('jquery')

export default {
  methods: {
    submit: async function () {
      try {
        var resp = await request.post(process.env.API_URL+'/user/')
          .send({name:this.full_name, password:"baconbaconbacon", email:this.email, phone:"6478392654", contriGL:20, contriRL:1})
        alert(resp)
      } catch (err) {
        alert('Error: ' + err);
      }
    }
  },
  data () {
    return {
      // note: changing this line won't causes changes
      // with hot-reload because the reloaded component
      // preserves its current state and we are modifying
      // its initial state.
      msg: 'User Profile!'
    }
  }
}
</script>
