<template lang='pug'>
  modal-template(
    class='is-centered'
    :class='{"has-background": !isConfirmation}'
    ref='modal'
  )
    template(slot='subtitle')
      i18n New proposal
    template(slot='title')
      i18n(key='title1' v-if='isConfirmation') Your proposal was created
      span(v-else) {{ title }}

    form.c-form
      slot

      label.field(v-if='isReasonStep' key='reason')
        i18n.label Why are you proposing this change?
        textarea.textarea(
          name='changeReason'
          ref='reason'
          maxlength='500'
        )
        i18n.helper This is optional.

      .c-confirmation(v-if='isConfirmation' key='confirmation')
        svg.c-svg
          use(href='#svg-proposal')

        i18n(html='Members of your group will now be asked to vote.</br>You need <strong>{value} yes votes</strong> for  your proposal to be accepted.' :args='{value: rule.value}')

      .buttons(:class='{ "is-centered": isConfirmation }')
        button.is-outlined(
          key='back'
          v-if='!isConfirmation'
          type='button'
          @click.prevent='prev'
          data-test='prevBtn'
        ) {{ currentStep === 0 ? L('Cancel') : L('Back') }}

        button(
          key='next'
          v-if='isNextStep'
          ref='next'
          @click.prevent='next'
          :disabled='disabled'
          data-test='nextBtn'
        )
          i18n Next
          i.icon-arrow-right

        i18n.is-success(
          key='create'
          tag='button'
          v-if='isReasonStep'
          ref='finish'
          @click.prevent='submit'
          :disabled='disabled'
          data-test='finishBtn'
        ) Create Proposal

        i18n.is-outlined(
          key='awesome'
          tag='button'
          v-if='isConfirmation'
          ref='close'
          @click.prevent='close'
          data-test='closeBtn'
        ) Awesome

    template(slot='footer' v-if='!isConfirmation && rule')
      .c-footer
        i.icon-vote-yea
        i18n(html='According to your voting rules, <strong>{value} out of {total} members</strong> will have to agree with this.' :args='{value: rule.value, total: rule.total}')
</template>

<script>
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import mixinSvgSprite from '@components/Sprites/mixinSvgSprite.js'

export default {
  name: 'ModalForm',
  mixins: [mixinSvgSprite('Dashboard')],
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
      this.$refs.modal.close()
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

.c-sprite {
  display: none;
}

.c-confirmation {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: $spacer;
}

.c-svg {
  height: 7rem;
  margin-bottom: $spacer-lg;
}

.c-form {
  position: relative;
}

.c-footer {
  display: flex;

  .icon-vote-yea {
    color: $primary_0;
    margin-right: $spacer;
  }
}
</style>
