<template lang='pug'>
  modal-template(
    data-test='modalProposal'
    class='is-centered'
    :class='{"has-background": !isConfirmation}'
    ref='modal'
  )
    template(slot='subtitle')
      i18n(v-if='groupShouldPropose') New proposal
    template(slot='title')
      i18n(key='title1' v-if='isConfirmation') Your proposal was created
      span(v-else) {{ title }}

    form.c-form(@submit.prevent='')
      slot

      label.field(v-if='isReasonStep' key='reason')
        i18n.label Why are you proposing this change?
        textarea.textarea(
          ref='reason'
          maxlength='500'
          data-test='reason'
        )
        i18n.helper This is optional.

      .c-confirmation(v-if='isConfirmation' key='confirmation')
        svg-proposal.c-svg
        i18n(
          :args='{ ...LTags("strong"), numVotes: rule.value }'
        ) Members of your group will now be asked to vote.{br_} You need {strong_}{numVotes} yes votes{_strong} for your proposal to be accepted.

      .buttons(:class='{ "is-centered": isConfirmation }')
        button.is-outlined(
          key='back'
          v-if='!isConfirmation'
          type='button'
          @click.prevent='prev'
          data-test='prevBtn'
        ) {{ currentStep === 0 ? L('Cancel') : L('Back') }}

        button-submit(
          key='change'
          :class='submitStyleNonProposal'
          v-if='!groupShouldPropose'
          @click='submit'
          :disabled='disabled'
          data-test='submitBtn'
        ) {{ submitTextNonProposal }}

        button(
          type='button'
          key='next'
          v-if='groupShouldPropose && isNextStep'
          @click.prevent='next'
          :disabled='disabled'
          data-test='nextBtn'
        )
          i18n Next
          i.icon-arrow-right.is-suffix

        button-submit.is-success(
          key='create'
          v-if='isReasonStep'
          @click='submit'
          :disabled='disabled'
          data-test='submitBtn'
        ) Create Proposal

        i18n.is-outlined(
          key='awesome'
          tag='button'
          type='button'
          v-if='isConfirmation'
          ref='close'
          @click.prevent='close'
          data-test='finishBtn'
        ) Awesome

    template(slot='footer' v-if='!isConfirmation && rule')
      .c-footer
        i.icon-vote-yea
        i18n(
          v-if='groupShouldPropose'
          :args='{ ...rule, ...LTags("strong") }'
        ) According to your voting rules, {strong_}{value} out of {total} members{_strong} will have to agree with this.
        i18n(
          v-else
          :args='LTags("strong")'
        ) Your group has less than 3 members, so {strong_}this change will be immediate{_strong} (no voting required).
</template>

<script>
import { mapGetters } from 'vuex'
import L from '@view-utils/translations.js'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import SvgProposal from '@svgs/proposal.svg'

export default {
  name: 'ModalForm',
  components: {
    ModalTemplate,
    SvgProposal,
    ButtonSubmit
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
    currentStep: Number,
    maxSteps: {
      type: Number,
      required: true
    },
    variant: {
      validator (value) {
        return ['addMember', 'removeMember'].indexOf(value) > -1
      }
    }
  },
  computed: {
    ...mapGetters([
      'groupShouldPropose'
    ]),
    isNextStep () {
      return this.currentStep <= this.maxSteps - 1
    },
    isReasonStep () {
      return this.currentStep === this.maxSteps
    },
    isConfirmation () {
      return this.currentStep === this.maxSteps + 1
    },
    submitStyleNonProposal () {
      return this.variant === 'removeMember' ? 'is-danger' : 'is-success'
    },
    submitTextNonProposal () {
      const text = {
        addMember: L('Send invitation'),
        removeMember: L('Remove Member'),
        default: L('Change')
      }

      return text[this.variant] || text.default
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    next () {
      // TODO/BUG - we must clear formMsg (if visible) when changing steps.
      this.$emit('update:currentStep', this.currentStep + 1)
    },
    prev () {
      if (this.currentStep > 0) {
        this.$emit('update:currentStep', this.currentStep - 1)
      } else {
        this.close()
      }
    },
    async submit () {
      const form = this.groupShouldPropose ? { reason: this.$refs.reason.value } : null
      await this.$listeners.submit(form)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

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
    margin-right: $spacer-sm;

    @include phone {
      display: none;
    }
  }
}
</style>
