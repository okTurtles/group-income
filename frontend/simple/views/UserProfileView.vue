<template>
  <vue-assistant :views="views" @done="done"></vue-assistant>
</template>
<script>
import VueAssistant from './VueAssistant.vue'
import SignUp from './SignUp.vue'
import PayGroup from './PayGroup.vue'
export default {
  name: 'UserProfileView',
  components: {
    'vue-assistant': VueAssistant
  },
  data () {
    return {
      views: [SignUp, PayGroup, {
        template: `<pay-group title='Overwritten title!' @next="$emit('next')"></pay-group>`,
        components: {'pay-group': PayGroup}
      }]
    }
  },
  methods: {
    done () {
      window.alert('done!')
    }
  }
}
</script>
