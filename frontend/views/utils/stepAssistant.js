// Usage:
// <template lang='pug'>
// router-view
//   button(@click='prev' :disabled='!this.currentStep') Back
//   button(@click='next' v-if='currentStep + 1 < config.steps.length') Next
//   button(@click='submit' v-if='currentStep + 1 === config.steps.length') Finish
// </template>
// <script>
// export default {
//   name: 'SomethingThatHasSteps',
//   mixins: [
//     StepAssistant
//   ],
//   ...
// }
// </script>

export default {
  name: 'StepAssistant',
  mounted () {
    this.redirect(this.config.steps[this.currentStep])
  },
  provide () {
    return {
      '$assistant': this
    }
  },
  methods: {
    redirect (content) {
      let query = { name: content }
      // Overright for modals
      if (this.$route.query.modal) {
        query = { query: { modal: this.$route.query.modal, step: content } }
      }
      this.$router.push(query).catch(console.error)
      this.content = content
    },
    next () {
      if (this.currentStep + 1 < this.config.steps.length) {
        this.redirect(this.config.steps[this.currentStep + 1])
      }
    },
    prev () {
      if (this.currentStep > 0) {
        this.redirect(this.config.steps[this.currentStep - 1])
      } else {
        this.$router.push({ query: { modal: null } })
      }
    },
    finish () {
      this.$emit('done')
    }
  },
  data () {
    return {
      content: '',
      config: { steps: [] }
    }
  },
  computed: {
    currentStep () {
      let current = this.$route.name
      if (this.$route.query.modal) {
        current = this.$route.query.step
      }
      return Math.max(this.config.steps.indexOf(current), 0)
    }
  }
}
