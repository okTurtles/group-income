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
import { logExceptNavigationDuplicated } from '~/frontend/views/utils/misc.js'

export default {
  name: 'StepAssistant',
  mounted () {
    this.redirect(this.config.steps[this.currentStep])
  },
  provide (): {|$assistant: any|} {
    return {
      '$assistant': this
    }
  },
  methods: {
    redirect (content: any) {
      let query = { name: content }
      // Overright for modals
      if (this.$route.query.modal) {
        query = { query: { modal: this.$route.query.modal, step: content } }
      }
      this.$router.push(query).catch(logExceptNavigationDuplicated)
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
  data (): {|config: {|steps: Array<any>|}, content: string|} {
    return {
      content: '',
      config: { steps: [] }
    }
  },
  computed: {
    currentStep (): number {
      let current = this.$route.name
      if (this.$route.query.modal) {
        current = this.$route.query.step
      }
      return Math.max(this.config.steps.indexOf(current), 0)
    }
  }
}
