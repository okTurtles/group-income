<template lang='pug'>
  modal-template(
    class='is-centered'
    :class='{"has-background": !isConfirmation}'
  )
    template(slot='subtitle')
      i18n New proposal
    template(slot='title')
      i18n(key='title1' v-if='isConfirmation') Your proposal was created
      span(v-else) {{ title }}

    form
      transition-group
        slot

        label.field(v-if='isReasonStep' key="reason")
          i18n.label Why are you proposing this change?
          textarea.textarea(
            name='changeReason'
            ref='reason'
            :placeholder='L("The reason why I\'m proposing this change is...")'
            maxlength='500'
          )
          i18n.helper This is optional.

        .confirmation(v-if='isConfirmation' key="confirmation")
          img(src='/assets/images/group-vote.png' alt='Group vote')
          p(v-html="L('Members of your group will now be asked to vote.</br>You need 8 yes votes for your proposal to be accepted.')")

      transition-group(
        class="buttons"
        :class='{ "is-centered": isConfirmation }'
      )
        button.is-outlined(
          key="back"
          v-if='!isConfirmation'
          @click.prevent='prev'
          data-test='prevBtn'
        )
          i18n {{ currentStep === 0 ? 'Cancel' : 'Back' }}

        button(
          key="next"
          v-if='isNextStep'
          ref='next'
          @click.prevent='next'
          :disabled='disabled'
          data-test='nextBtn'
        )
          i18n Next
          i.icon-arrow-right

        i18n.is-success(
          key="create"
          tag='button'
          v-if='isReasonStep'
          ref='finish'
          @click.prevent='submit'
          :disabled='disabled'
          data-test='finishBtn'
        ) Create Proposal

        i18n.is-outlined(
          key="awesome"
          tag='button'
          v-if='isConfirmation'
          ref='close'
          @click.prevent='close'
          data-test='closeBtn'
        ) Awesome

    template(slot='footer' v-if='!isConfirmation && rule')
      .c-footer
        i.icon-vote-yea
        i18n(html='According to your voting rules, <b>{value} out of {total} members</b> will have to agree with this.' :args='{value: rule.value, total: rule.total}')
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
    rule: {
      type: Object,
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
      this.$emit('submit', {
        reason: this.$refs.reason.value
      })
    }
  },
  computed: {
    isNextStep () {
      return this.currentStep <= this.maxSteps - 1
    },
    isReasonStep () {
      return this.currentStep === this.maxSteps
    },
    isConfirmation () {
      return this.currentStep === this.maxSteps + 1
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
    height: 100px; // TODO SVG
    margin: 0 auto 2rem;
  }
}

.c-footer {
  display: flex;

  .icon-vote-yea {
    color: $primary_0;
    margin-right: $spacer;
  }
}
</style>
