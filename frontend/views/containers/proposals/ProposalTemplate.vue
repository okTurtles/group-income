<template lang='pug'>
  modal-template(class='has-background is-centered')
    template(slot='subtitle')
      i18n New proposal
    template(slot='title')
      i18n(v-if='isConfirmation') Your proposal was created
      i18n(v-else) {{ title }}

    form
      transition(name='fade' mode='out-in')
        slot

        .confirmation(v-if='isConfirmation')
          img(src='/assets/images/group-vote.png' alt='Group vote')
          p(v-html="L('Members of your group will now be asked to vote.</br>You need 8 yes votes for your proposal to be accepted.')")

      .buttons(:class='{ "is-centered": isConfirmation }')
        button.is-outlined(
          v-if='!isConfirmation'
          @click.prevent='prev'
          data-test='prevBtn'
        )
          i18n {{ currentStep === 0 ? 'Cancel' : 'Back' }}

        button.is-success(
          v-if='isNextStep'
          ref='next'
          @click.prevent='next'
          :disabled='disabled'
          data-test='nextBtn'
        )
          i18n Next
          i.icon-arrow-right

        button.is-success(
          v-if='isLastStep'
          ref='finish'
          @click.prevent='submit'
          :disabled='disabled'
          data-test='finishBtn'
        )
          i18n Create Proposal

        button.is-outlined(
          v-if='isConfirmation'
          ref='close'
          @click.prevent='close'
          data-test='closeBtn'
        )
          i18n Awesome

    template(#footer='' v-if='!isConfirmation')
      i18n(v-if='footer') {{ footer }}
</template>

<script>
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import { CLOSE_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'

export default {
  name: 'ModalForm',
  components: {
    ModalTemplate
  },
  props: {
    title: {
      type: String,
      required: true
    },
    footer: {
      type: String,
      required: true
    },
    disabled: Boolean,
    maxSteps: {
      type: Number,
      required: true
    }
  },
  data () {
    return {
      currentStep: 0
    }
  },
  methods: {
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    },
    next () {
      this.currentStep++
      this.updateParent()
    },
    prev () {
      if (this.currentStep > 0) {
        this.currentStep--
        this.updateParent()
      } else {
        this.close()
      }
    },
    updateParent () {
      this.$emit('update:currentStep', this.currentStep)
    },
    submit () {
      this.next()
      this.$emit('submit')
    }
  },
  computed: {
    isNextStep () {
      return this.currentStep < this.maxSteps - 1
    },
    isLastStep () {
      return this.currentStep === this.maxSteps - 1
    },
    isConfirmation () {
      return this.currentStep === this.maxSteps
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.confirmation {
  display: flex;
  flex-direction: column;
  text-align: center;

  img {
    margin: 0 auto 2rem;
  }
}
</style>
