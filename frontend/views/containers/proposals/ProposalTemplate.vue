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
        i18n(html='Members of your group will now be asked to vote.</br>You need <strong>{value} yes votes</strong> for  your proposal to be accepted.' :args='{value: rule.value}')

      .buttons(:class='{ "is-centered": isConfirmation }')
        button.is-outlined(
          key='back'
          v-if='!isConfirmation'
          type='button'
          @click.prevent='prev'
          data-test='prevBtn'
        ) {{ currentStep === 0 ? L('Cancel') : L('Back') }}

        button.is-success(
          key='change'
          v-if='!groupShouldPropose'
          @click.prevent='submit'
          :disabled='disabled'
          data-test='submitBtn'
        ) {{ submitTextNonProposal }}

        button(
          key='next'
          type='button'
          v-if='groupShouldPropose && isNextStep'
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
          @click.prevent='submit'
          :disabled='disabled'
          data-test='submitBtn'
        ) Create Proposal

        i18n.is-outlined(
          key='awesome'
          tag='button'
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
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import SvgProposal from '@svgs/proposal.svg'

export default {
  name: 'ModalForm',
  components: {
    ModalTemplate,
    SvgProposal
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
    },
    variant: {
      validator (value) {
        return ['addMember', 'removeMember'].indexOf(value) > -1
      }
    }
  },
  data () {
    return {
      currentStep: 0
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
      if (this.groupShouldPropose) {
        this.next()
        this.$emit('submit', {
          reason: this.$refs.reason.value
        })
      } else {
        this.$emit('submit')
      }
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
    margin-right: $spacer-sm;

    @include phone {
      display: none;
    }
  }
}
</style>
