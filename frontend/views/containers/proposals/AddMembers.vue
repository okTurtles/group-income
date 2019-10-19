<template lang='pug'>
  proposal-template(
    :title='L("Add new members")'
    :rule='rule'
    :disabled='this.ephemeral.invitesToSend.length === 0'
    :maxSteps='config.steps.length'
    :currentStep.sync='ephemeral.currentStep'
    variant='addMember'
    @submit='submit'
  )
    fieldset(v-if='ephemeral.currentStep === 0' key='0')
      i18n.label(tag='legend') Full name
      label.field
        i18n.label.sr-only Full name
        .input-combo(v-error:invitee='')
          input.input(
            type='text'
            v-model.lazy='$v.form.invitee.$model'
            @keyup.enter='addInvitee'
            required
          )
          button(
            type='button'
            data-test='add'
            @click='addInvitee'
          ) {{ L('Add') }}
      ul.c-list
        li.c-list-item(
          v-for='(invitee, index) in ephemeral.invitesToSend'
          :key='`invitee-${index}`'
        )
          span {{ invitee.name }}
          button.is-icon-small(
            type='button'
            @click='removeInvitee(index)'
            data-test='removeInvitee'
            :aria-label='L("Remove invitee")'
          )
            i.icon-times
      p.helper(
        v-if='ephemeral.feedbackMsg.text'
        :class='ephemeral.feedbackMsg.class'
        data-test='feedbackMsg'
      ) {{ ephemeral.feedbackMsg.text }}
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import { validationMixin } from 'vuelidate'
import sbp from '~/shared/sbp.js'
import { PROPOSAL_INVITE_MEMBER, buildInvitationUrl } from '@model/contracts/voting/proposals.js'
import { generateInvites } from '@model/contracts/group.js'
import { TYPE_MESSAGE } from '@model/contracts/mailbox.js'
// import L from '@view-utils/translations.js'
import ProposalTemplate from './ProposalTemplate.vue'

export default {
  name: 'AddMembers',
  components: {
    ProposalTemplate
  },
  mixins: [
    validationMixin
  ],
  data () {
    return {
      form: {
        invitee: null
      },
      ephemeral: {
        invitesToSend: [],
        currentStep: 0,
        feedbackMsg: {} // TODO/OPTIMIZE: use something similar to vError
      },
      config: {
        steps: [
          'Member'
        ]
      }
    }
  },
  validations: {
    steps: {
      Invitee: [
        'form.invitee'
      ]
    },
    form: {
      invitee: {
        // [L("You can't invite yourself")]: function (invitee) {
        //   return invitee !== this.ourUsername
        // },
        // [L('This person is already on the group')]: function (invitee) {
        //   return !this.currentGroupState.profiles[invitee]
        // }
        // TODO - vError doesnt support async validations.
        // [L('Non existing user. TODO support general invites')]: async function (invitee) {
        //   try {
        //     const contractID = await sbp('namespace/lookup', invitee)
        //     const userState = await sbp('state/latestContractState', contractID)
        //     this.ephemeral.invitesToSend.push({ contractID, ...userState })
        //     this.ephemeral.isValid = true
        //     return false
        //   } catch (err) {
        //     console.log(err)
        //     return true
        //   }
        // }
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
    removeInvitee (index) {
      this.ephemeral.invitesToSend.splice(index, 1)
    },
    async submit (form) {
      try {
        const groupId = this.currentGroupId
        const groupName = this.groupSettings.groupName
        // NOTE: All invitees proposals will expire at the exact same time.
        // That plus the proposal creator is what we'll use to know
        // which proposals should be displayed visually together.
        const expiresDateMs = Date.now() + this.groupSettings.proposals[PROPOSAL_INVITE_MEMBER].expires_ms
        for (const index in this.ephemeral.invitesToSend) {
          const member = this.ephemeral.invitesToSend[index]
          const mailbox = member.attributes.mailbox
          const memberName = member.attributes.name

          if (this.groupShouldPropose) {
            const proposal = await sbp('gi.contracts/group/proposal/create',
              {
                proposalType: PROPOSAL_INVITE_MEMBER,
                proposalData: {
                  member: memberName,
                  reason: form.reason
                },
                votingRule: this.groupSettings.proposals[PROPOSAL_INVITE_MEMBER].rule,
                expires_date_ms: expiresDateMs
              },
              groupId
            )
            await sbp('backend/publishLogEntry', proposal)

            this.ephemeral.feedbackMsg = {
              text: this.L('Member proposed successfully!'),
              class: 'has-text-success'
            }
          } else {
            const invite = generateInvites(1)
            const inviteToMailbox = await sbp('gi.contracts/mailbox/postMessage/create',
              {
                messageType: TYPE_MESSAGE,
                from: groupName,
                subject: `You've been invited to join ${groupName}!`,
                message: `Hi ${memberName},

                Here's your special invite link:

                ${buildInvitationUrl(this.$store.state.currentGroupId, invite.inviteSecret)}`
              },
              mailbox
            )
            const inviteToGroup = await sbp('gi.contracts/group/invite/create',
              invite, // or, if this is a bulk invite, the number of members invited
              groupId
            )
            await sbp('backend/publishLogEntry', inviteToGroup)
            await sbp('backend/publishLogEntry', inviteToMailbox)

            this.ephemeral.feedbackMsg = {
              text: this.L('Member invited successfully!'),
              class: 'has-text-success'
            }
          }
        }
      } catch (error) {
        console.error(error)
        // TODO: Create More descriptive errors
        this.ephemeral.feedbackMsg = this.L('Failed to invite, please try again.')
      }
    }
  }
}
</script>
<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-list {
  margin: $spacer 0;

  &-item {
    display: flex;
    background: $general_2;
    padding: $spacer-sm;
    justify-content: space-between;
    align-items: center;
    margin-top: $spacer-xs;
  }
}
</style>
