<template lang='pug'>
  proposal-template(
    :title='L("Add new members")'
    :rule='{ value: 5, total: 10 }'
    :disabled='!ephemeral.isValid'
    :maxSteps='config.steps.length'
    :currentStep.sync='ephemeral.currentStep'
    variant='addMember'
    @submit='submit'
  )
    div(v-if='ephemeral.currentStep === 0' key='0')
      i18n.label Username
      label.field(
        v-for='(member, index) in ephemeral.invitesCount'
        :key='`member-${index}`'
        data-test='invitee'
      )
        i18n.label.sr-only Username
        .input-combo
          input.input(
            type='text'
            v-model='form.invitees[index]'
            @keyup.enter='() => addInvitee(index)'
            aria-required
          )
          button(
            type='button'
            data-test='add'
            @click='() => addInvitee(index)'
          ) {{ L('Add') }}
          button.is-icon-small.is-shifted(
            v-if='index > 0'
            type='button'
            @click='() => removeInvitee(index)'
            data-test='remove'
            aria-label='L("Remove invitee")'
          )
            i.icon-times
        // NOTE/TODO: These validations will be removed on issue #609
        p.helper(
          v-if='form.eachFeedbackMsg[index]'
          :class='form.eachFeedbackMsg[index].class'
          data-test='feedbackMsg'
        ) {{ form.eachFeedbackMsg[index].text }}

      button.link.has-icon.c-addPeople(
        type='button'
        @click='addInviteeSlot'
        data-test='addMorePeople'
      )
        i.icon-plus
        i18n Add more people
</template>

<script>
import Vue from 'vue'
import { mapState, mapGetters } from 'vuex'
import sbp from '~/shared/sbp.js'
import { PROPOSAL_INVITE_MEMBER, buildInvitationUrl } from '@model/contracts/voting/proposals.js'
import { generateInvites } from '@model/contracts/group.js'
import { TYPE_MESSAGE } from '@model/contracts/mailbox.js'
import ProposalTemplate from './ProposalTemplate.vue'

export default {
  name: 'AddMembers',
  components: {
    ProposalTemplate
  },
  data () {
    return {
      form: {
        invitees: [],
        eachFeedbackMsg: []
      },
      ephemeral: {
        currentStep: 0,
        isValid: false,
        invitesCount: 1,
        invitesToSend: []
      },
      config: {
        steps: [
          'Member'
        ]
      }
    }
  },
  validations: {
    // validation groups by route name for steps
    steps: {
      Member: [
        'form.member'
      ]
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
      'groupShouldPropose'
    ])
  },
  methods: {
    async addInvitee (index) {
      const searchUser = this.form.invitees[index]

      if (searchUser === this.$store.state.loggedIn.username) {
        return this.setInviteError(index, this.L('You can\'t invite yourself'))
      }

      if (this.currentGroupState.profiles[searchUser]) {
        return this.setInviteError(index,
          this.L('{searchUser} is already on the group', { searchUser })
        )
      }

      try {
        const contractID = await sbp('namespace/lookup', searchUser)
        const userState = await sbp('state/latestContractState', contractID)
        this.ephemeral.invitesToSend[index] = { contractID, ...userState }
        Vue.set(this.form.eachFeedbackMsg, index, {
          text: this.L('Ready to be invited!'),
          class: 'has-text-success'
        })
        this.ephemeral.isValid = true
      } catch (err) {
        console.log(err)
        return this.setInviteError(index, this.L('Non existing user. TODO support general invites'))
      }
    },
    setInviteError (index, text) {
      this.ephemeral.invitesToSend[index] = null
      Vue.set(this.form.eachFeedbackMsg, index, null)
      Vue.set(this.form.eachFeedbackMsg, index, {
        text,
        class: 'error'
      })
      return false
    },
    removeInvitee (index) {
      this.ephemeral.invitesCount -= 1
      this.form.invitees.splice(index, 1)
      this.ephemeral.invitesToSend[index] = null
    },
    addInviteeSlot () {
      this.ephemeral.invitesCount += 1
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

            Vue.set(this.form.eachFeedbackMsg, index, {
              text: this.L('Member proposed successfully!'),
              class: 'has-text-success'
            })
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

            Vue.set(this.form.eachFeedbackMsg, index, null)
            Vue.set(this.form.eachFeedbackMsg, index, {
              text: this.L('Member invited successfully!'),
              class: 'has-text-success'
            })
          }
        }
      } catch (error) {
        console.error(error)
        // TODO: Create More descriptive errors
        this.form.eachFeedbackMsg = this.L('Failed to invite, please try again.')
      }
    }
  }
}
</script>
<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-addPeople {
  margin-top: $spacer;

  .icon-plus {
    margin-right: $spacer-sm;
  }
}
</style>
