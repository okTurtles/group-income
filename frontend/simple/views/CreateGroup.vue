<template>
  <div>
    <!-- This is pretty confusing. it will confuse most
    people. Better to just do /signup?next=create-group -->
    <div class="is-hidden" id="createGroupEl">
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
    </div>
    <!-- TODO: is it possible to bind directly to :components? -->
    <!-- TODO: would it be better if we used <vue-router>?
               i.e. it might be better to just append a thing
               to the URL, like /signup?next=create-group -->
    <vue-assistant
      :show-steps="!loggedIn"
      :views="['sign-up', 'create-group']"
    >
      <!-- First an explainer that says "we're going to create a Constitution for the group." -->
      <!-- Create a SetupAssistant type component to move through these different steps -->
      
    </vue-assistant>
  </div>
</template>

<script>
import Vue from 'vue'
import VueAssistant from './VueAssistant.vue'
import SignUp from './SignUp.vue'
// check that we're logged in, otherwise explain that we must first create an account

// "local registration": http://vuejs.org/guide/components.html#Local-Registration
VueAssistant.components = {
  'sign-up': SignUp,
  'create-group': {
    name: 'CreateGroup',
    // replace: false,
    template: '#createGroupEl'
  }
}

export default {
  name: 'CreateGroupView',
  components: {'vue-assistant': VueAssistant},
  init () {
    console.log(this.$options.name, 'init!', this.$options.components)
  },
  // http://router.vuejs.org/en/pipeline/hooks.html
  // http://router.vuejs.org/en/pipeline/data.html <- data vs activate!
  // http://router.vuejs.org/en/pipeline/index.html
  route: {
    activate () {
      console.log(this.$options.name, 'activate!', this.$options.components)
    }
  },
  computed: {
    loggedIn () {
      return false
    }
  }
}
</script>