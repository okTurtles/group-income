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
      .c-feedback(
        v-if='ephemeral.formFeedbackMsg.text'
        :class='ephemeral.formFeedbackMsg.class'
        data-test='feedbackMsg'
      ) {{ephemeral.formFeedbackMsg.text}}
</template>

<script>
import Vue from 'vue'
import { mapState, mapGetters } from 'vuex'
import { validationMixin } from 'vuelidate'
import sbp from '~/shared/sbp.js'
import { PROPOSAL_INVITE_MEMBER, buildInvitationUrl } from '@model/contracts/voting/proposals.js'
import { generateInvites } from '@model/contracts/group.js'
import { TYPE_MESSAGE } from '@model/contracts/mailbox.js'
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
        formFeedbackMsg: {},
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
      'groupShouldPropose',
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
      let hasFailed = false
      // NOTE: All invitees proposals will expire at the exact same time.
      // That plus the proposal creator is what we'll use to know
      // which proposals should be displayed visually together.
      const expiresDateMs = Date.now() + this.groupSettings.proposals[PROPOSAL_INVITE_MEMBER].expires_ms

      for (const inviteeName of this.form.invitees) {
        const groupId = this.currentGroupId
        const contractID = await sbp('namespace/lookup', inviteeName)

        if (this.groupShouldPropose) {
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
          } catch (e) {
            this.ephemeral.formFeedbackMsg = {
              text: L('Invites to {inviteeName} failed!'),
              class: 'has-text-danger'
            }
            console.error(`Invitees to ${inviteeName} failed to be sent!`, e)
            hasFailed = true
          }
        } else {
          // TODO - This scenario isnt needed after #614 is done.
          const invite = generateInvites(1, inviteeName)
          if (contractID) {
            try {
              const identityContract = await sbp('state/latestContractState', contractID)
              const groupName = this.groupSettings.groupName
              const inviteToMailbox = await sbp('gi.contracts/mailbox/postMessage/create', {
                messageType: TYPE_MESSAGE,
                from: groupName,
                subject: `You've been invited to join ${groupName}!`,
                message: `Hi ${inviteeName},
                Here's your special invite link:
                ${buildInvitationUrl(this.$store.state.currentGroupId, invite.inviteSecret)}`
              }, identityContract.attributes.mailbox)

              const inviteToGroup = await sbp('gi.contracts/group/invite/create', invite, groupId)
              await sbp('backend/publishLogEntry', inviteToGroup)
              await sbp('backend/publishLogEntry', inviteToMailbox)
              invitationsSent.push(inviteeName)
            } catch (e) {
              console.error(`Invitees to ${inviteeName} failed to be sent!`, e)
            }
          } else {
            invitationsSent.push(inviteeName)
            console.warn(`The invitee ${inviteeName} isn't registered. TODO #614`)
          }

          this.ephemeral.formFeedbackMsg = {
            text: L('Invites to {invitationsSent} sent successfully!', {
              invitationsSent: invitationsSent.join(', ')
            }),
            class: 'has-text-success'
          }
          this.resetInvitations()
        }
      }

      if (this.groupShouldPropose && !hasFailed) {
        // Show Success step!
        this.ephemeral.currentStep += 1
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
