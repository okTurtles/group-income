<template>
  <section class="section">
    <div class="container">
      <div class="columns">
        <div class="column">
          <h2 class="subtitle">Describe your group</h2>
          <div class="box">
            <b>What is your group's name?</b>
          </div>
        </div>
        <div class="column">
          <h2 class="subtitle">Member your group</h2>
          <div class="box">
            <b>What is your group's name?</b>
          </div>
        </div>
        <div class="column">
          <h2 class="subtitle">Resource allocation</h2>
          <div class="box">
            <b>What is your group's name?</b>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import SignUp from './SignUp.vue'
import {loginLogout} from '../js/mixins'

export default {
  name: 'CreateGroupView',
  mixins: [loginLogout],
  // http://router.vuejs.org/en/pipeline/hooks.html
  // http://router.vuejs.org/en/pipeline/data.html <- data vs activate!
  // http://router.vuejs.org/en/pipeline/index.html
  route: {
    activate (transition) {
      console.log(this.$options.name, 'activate!')
      if (!this.loggedIn) {
        console.log(this.$options.name, `redirecting to ${SignUp.name}!`)
        transition.redirect({name: SignUp.name, query: {next: this.$route.path}})
      } else {
        transition.next()
      }
    }
  }
}
</script>
