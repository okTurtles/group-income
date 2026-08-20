<template lang='pug'>
  modal-template(
    data-test='modalProposal'
    class='is-centered'
    :class='{"has-background": !isConfirmation}'
    ref='modal'
    :a11yTitle='title'
  )
    template(slot='subtitle')
      i18n(v-if='shouldPropose') New proposal
    template(slot='title')
      i18n(key='title1' v-if='isConfirmation') Your proposal was created
      span(v-else) {{ title }}

    form.c-form(
      @submit.prevent=''
      @keyup.enter='onEnterPressed'
    )
      slot

      label.field(v-if='isReasonStep' key='reason')
        .c-reason-label-container
          i18n.label Why are you proposing this change?
          char-length-indicator(
            v-if='form.reason'
            :current-length='form.reason.length || 0'
            :max='config.reasonMaxChar'
          )
        textarea.textarea(
          v-model='form.reason'
          ref='reason'
          :maxlength='config.reasonMaxChar'
          data-test='reason'
        )
        i18n.helper This is optional.

      .c-confirmation(v-if='isConfirmation' key='confirmation')
        svg-proposal.c-svg
        i18n Members of your group will now be asked to vote.
        span(v-safe-html='confirmationVotingExplanation')

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
          v-if='!isConfirmation && !shouldPropose'
          @click='submit'
          :disabled='disabled || (!isGroupCreator && !shouldImmediateChange)'
          data-test='submitBtn'
        ) {{ submitTextNonProposal }}

        button(
          type='button'
          key='next'
          v-if='shouldPropose && hasNextStep'
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

    template(slot='footer' v-if='!isConfirmation')
      .c-footer
        i.icon-vote-yea
        span(v-if='shouldPropose' v-safe-html='footerVotingExplanation')
        slot(v-else-if='shouldImmediateChange' name='shouldImmediateChangeFooter')
        i18n(
          v-else-if='!groupShouldPropose'
          :args='LTags("strong")'
        ) Your group has less than 3 members, so {strong_}this change will be immediate{_strong} (no voting required).
</template>

<script>
import { mapGetters } from 'vuex'
import { L, LTags } from '@common/common.js'
import { PROPOSAL_REASON_MAX_CHAR } from '@model/contracts/shared/constants.js'
import { RULE_PERCENTAGE, RULE_DISAGREEMENT, getThresholdAdjusted, getCountOutOfMembers } from '@model/contracts/shared/voting/rules.js'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import CharLengthIndicator from '@components/CharLengthIndicator.vue'
import SvgProposal from '@svgs/proposal.svg'

export default ({
  name: 'ModalForm',
  components: {
    ModalTemplate,
    SvgProposal,
    ButtonSubmit,
    CharLengthIndicator
  },
  props: {
    title: {
      type: String,
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
        return ['addMember', 'addMemberImmediate', 'removeMember'].indexOf(value) > -1
      }
    },
    shouldImmediateChange: Boolean
  },
  data () {
    return {
      form: {
        reason: '' // optional field
      },
      config: {
        reasonMaxChar: PROPOSAL_REASON_MAX_CHAR
      }
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupOwnerID',
      'ourIdentityContractId',
      'groupMembersCount',
      'groupShouldPropose',
      'groupProposalSettings'
    ]),
    shouldPropose () {
      return this.groupShouldPropose && !this.shouldImmediateChange
    },
    proposalSettings () {
      return this.groupProposalSettings()
    },
    isGroupCreator () {
      return this.ourIdentityContractId === this.currentGroupOwnerID
    },
    hasNextStep () {
      return this.currentStep <= this.maxSteps - 1
    },
    isReasonStep () {
      return this.currentStep === this.maxSteps
    },
    isConfirmation () {
      return this.currentStep === this.maxSteps + 1
    },
    threshold () {
      const threshold = this.proposalSettings.ruleSettings[this.proposalSettings.rule].threshold
      return getThresholdAdjusted(this.proposalSettings.rule, threshold, this.groupMembersCount)
    },
    footerVotingExplanation () {
      return {
        [RULE_DISAGREEMENT]: () => {
          if (this.threshold === 1) {
            return L('Your proposal will pass if {b_}no one{_b} disagrees.', LTags('b'))
          }
          return L('Your proposal will pass if {b_}fewer than {n} members{_b} disagree.', { n: this.threshold, ...LTags('b') })
        },
        [RULE_PERCENTAGE]: () => {
          return L('Your proposal will pass if {b_}{value} out of {total} members{_b} agree.', {
            value: this.fixedCount(),
            total: this.groupMembersCount,
            ...LTags('b')
          })
        }
      }[this.proposalSettings.rule]()
    },
    confirmationVotingExplanation () {
      // REVIEW PR - @mmbotelho - This and footerVotingExplanation could be the same text for simplicity.
      return {
        [RULE_DISAGREEMENT]: () => {
          if (this.threshold === 1) {
            return L('Your proposal will pass if {b_}no one{_b} disagrees.', LTags('b'))
          }
          return L('Your proposal will pass if {b_}less than {n} members{_b} disagree.', { n: this.threshold, ...LTags('b') })
        },
        [RULE_PERCENTAGE]: () => {
          return L('You need {b_}{n} yes votes{_b} for your proposal to be accepted.', {
            n: this.fixedCount(),
            ...LTags('b')
          })
        }
      }[this.proposalSettings.rule]()
    },
    submitStyleNonProposal () {
      return this.variant === 'removeMember' ? 'is-danger' : 'is-success'
    },
    submitTextNonProposal () {
      const text = {
        addMember: L('Send invitation'),
        addMemberImmediate: L('Create invitation'),
        removeMember: L('Remove Member'),
        default: L('Change')
      }

      return text[this.variant] || text.default
    }
  },
  methods: {
    close () {
      this.$refs.modal.unload()
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
    fixedCount () {
      let n = getCountOutOfMembers(this.groupMembersCount, this.threshold)
      if (this.variant === 'removeMember' && n === this.groupMembersCount) {
        n -= 1 // don't include the member to-be-removed in the count
      }
      return n
    },
    async submit () {
      const form = this.shouldPropose ? { reason: this.$refs.reason.value } : null
      await this.$listeners.submit(form)
    },
    onEnterPressed () {
      if (this.hasNextStep && this.shouldPropose && !this.disabled) {
        this.next()
      }
    }
  },
  watch: {
    isReasonStep (newValue, oldValue) {
      if (newValue) {
        // NOTE: nextTick is necessary because `reason` textarea is created
        //       when isReasonStep becomes true since v-if is used
        this.$nextTick(() => {
          this.$refs.reason.focus()
        })
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-sprite {
  display: none;
}

.c-reason-label-container {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  column-gap: 0.5rem;
}

.c-confirmation {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 1rem;
}

.c-svg {
  height: 7rem;
  margin-bottom: 2rem;
}

.c-form {
  position: relative;
}

.c-footer {
  display: flex;

  .icon-vote-yea {
    color: $primary_0;
    margin-right: 0.5rem;

    @include phone {
      display: none;
    }
  }
}

.buttons {
  row-gap: 0.75rem;
}
</style>
