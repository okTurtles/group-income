<template lang='pug'>
  proposal-template(
    :title='L("Add new members")'
    :rule='rule'
    :disabled='!ephemeral.isValid'
    :maxSteps='config.steps.length'
    :currentStep.sync='ephemeral.currentStep'
    variant='addMember'
    @submit='submit'
  )
    fieldset(v-if='ephemeral.currentStep === 0' key='0' ref='fieldset')
      i18n.label(tag='legend') Full name
      label.field(
        v-for='(member, index) in ephemeral.invitesCount'
        :key='`member-${index}`'
        data-test='invitee'
      )
        i18n.label.sr-only Username
        .input-shifted
          input.input(
            type='text'
            v-model='form.invitees[index]'
            @keyup='(e) => inviteeUpdate(e, index)'
            aria-required
          )
          button.is-icon-small(
            v-if='index > 0'
            type='button'
            @click='removeInvitee(index)'
            data-test='remove'
            :aria-label='L("Remove invitee")'
          )
            i.icon-times

      button.link.has-icon.c-addPeople(
        type='button'
        @click='addInviteeSlot'
        data-test='addInviteeSlot'
      )
        i.icon-plus
        i18n Add more
      .c-feedback.has-text-success( v-if='ephemeral.formSuccessMsg' data-test='feedbackMsg') {{ ephemeral.formSuccessMsg }}
      .c-feedback.has-text-danger( v-if='ephemeral.formErrorMsg' data-test='feedbackMsg') {{ ephemeral.formErrorMsg }}
</template>

<script>
import Vue from 'vue'
import { mapState, mapGetters } from 'vuex'
import { validationMixin } from 'vuelidate'
import sbp from '~/shared/sbp.js'
import { PROPOSAL_INVITE_MEMBER } from '@model/contracts/voting/proposals.js'
import ProposalTemplate from './ProposalTemplate.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'AddMembers',
  mixins: [validationMixin],
  components: {
    ProposalTemplate
  },
  data () {
    return {
      form: {
        invitees: []
      },
      ephemeral: {
        formSuccessMsg: null,
        formErrorMsg: null,
        currentStep: 0,
        isValid: false,
        invitesCount: 1
      },
      config: {
        steps: [
          'Member'
        ]
      }
    }
  },
  computed: {
    ...mapState([
      'currentGroupId',
      'loggedIn'
    ]),
    ...mapGetters([
      'currentGroupState',
      'groupSettings',
      'groupMembersCount',
      'ourUsername'
    ]),
    rule () {
      const { threshold } = this.groupSettings.proposals['invite-member'].ruleSettings.threshold
      return { value: Math.round(this.groupMembersCount * threshold), total: this.groupMembersCount }
    }
  },
  methods: {
    inviteeUpdate (e, index) {
      if (e.target.value.length > 0 && !this.ephemeral.isValid) {
        this.ephemeral.isValid = true
      }
      if (e.target.value.length === 0 && this.ephemeral.invitesCount === 1 && this.ephemeral.isValid) {
        this.ephemeral.isValid = false
      }
    },
    removeInvitee (index) {
      this.ephemeral.invitesCount -= 1
      this.form.invitees.splice(index, 1)
    },
    addInviteeSlot (e) {
      this.ephemeral.invitesCount += 1
      Vue.nextTick(() => {
        const inviteeSlots = this.$refs.fieldset.getElementsByTagName('label')
        const newInviteeSlot = inviteeSlots[inviteeSlots.length - 1]
        newInviteeSlot && newInviteeSlot.focus()
      })
    },
    resetInvitations () {
      this.ephemeral.invitesCount = 1
      this.form.invitees[0] = ''
    },
    async submit (form) {
      const invitationsSent = []
      const invitationsFailed = []
      // NOTE: All invitees proposals will expire at the exact same time.
      // That plus the proposal creator is what we'll use to know
      // which proposals should be displayed visually together.
      const expiresDateMs = Date.now() + this.groupSettings.proposals[PROPOSAL_INVITE_MEMBER].expires_ms

      for (const inviteeName of this.form.invitees) {
        const groupId = this.currentGroupId
        try {
          const proposal = await sbp('gi.contracts/group/proposal/create',
            {
              proposalType: PROPOSAL_INVITE_MEMBER,
              proposalData: {
                member: inviteeName,
                reason: form.reason
              },
              votingRule: this.groupSettings.proposals[PROPOSAL_INVITE_MEMBER].rule,
              expires_date_ms: expiresDateMs
            },
            groupId
          )
          await sbp('backend/publishLogEntry', proposal)
          invitationsSent.push(inviteeName)
          this.ephemeral.formSuccessMsg = L('Invites to {invitationsSent} sent successfully!', {
            invitationsSent: invitationsSent.join(', ')
          })
        } catch (e) {
          console.error(`Invite to ${inviteeName} failed to be sent!`, e)
          invitationsFailed.push(inviteeName)
          this.ephemeral.formErrorMsg = L('Invites to {invitationsFailed} failed!', {
            invitationsFailed: invitationsFailed.join(', ')
          })
        }
      }

      if (invitationsFailed.length === 0) {
        this.resetInvitations()
        this.ephemeral.currentStep += 1 // Show Success step!
      }
    }
  }
}
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-addPeople {
  margin: $spacer-sm 0 $spacer;

  .icon-plus {
    margin-right: $spacer-sm;
  }
}

.c-feedback {
  text-align: center;
}
</style>
