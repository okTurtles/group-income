// usage:
// <template lang="pug">
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
    if (this.currentStep === 0) {
      this.$router.push({ name: this.config.steps[this.currentStep] })
    }
  },
  methods: {
    next () {
      if (this.currentStep + 1 < this.config.steps.length) {
        this.$router.push({ name: this.config.steps[this.currentStep + 1] })
      }
    },
    prev () {
      if (this.currentStep > 0) {
        this.$router.push({ name: this.config.steps[this.currentStep - 1] })
      } else {
        this.$router.push({ path: '/' })
      }
    },
    finish () {
      this.$emit('done')
    }
  },
  data () {
    return {
      config: { steps: [] }
    }
  },
  computed: {
    currentStep () {
      // get current step index from current route
      return Math.max(this.config.steps.indexOf(this.$route.name), 0)
    }
  }
}
