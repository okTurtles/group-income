<template lang='pug'>
.c-message
  .c-icon
    svg-horn
  .c-body
    .c-header
      span.c-title.is-title-5(:class='interactiveMessage.proposalSeverity') {{interactiveMessage.proposalStatus}}
      span.has-text-1 {{getTime(time)}}
    .c-text
      | {{interactiveMessage.text}}
      i18n.c-link(
        tag='a'
        href='https://groupincome.org/todo/'
        target='_blank'
      ) See proposal

</template>

<script>
import {
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  STATUS_OPEN,
  STATUS_PASSED,
  STATUS_EXPIRED,
  STATUS_FAILED,
  STATUS_CANCELLED
} from '@model/contracts/voting/constants.js'

import { interactionType, fakeProposals } from '@containers/chatroom/fakeStore.js'
import SvgHorn from '@svgs/horn.svg'
import L from '@view-utils/translations.js'
import chatroom from '@containers/chatroom/chatroom.js'
import { getTime } from '@utils/time.js'

const interactiveMessage = (interaction, summary = null) => {
  return {
    'invite-member': {
      open: L('{from} wants to add new members to the group.', interaction),
      passed: L('Added members to this group: {to}', interaction),
      default: L('No members were added.')
    },
    'remove-member': {
      open: L('{from} wants to remove members from the group.', interaction),
      passed: L('Left {title}', summary),
      default: L('No members were removed.')
    },
    'group-setting-change': {
      mincomeAmount: {
        open: L('{from} wants to change the change the groups mincome. ', interaction),
        passed: L('The groups mincome changed.'),
        default: L('The group mincome hasn\'t changed.')
      }
    },
    'proposal-setting-change': {
      votingRule: {
        open: L('{from} wants to change the groups voting rules. ', interaction),
        passed: L('The groups voting rules changed'),
        default: L('The groups voting rules hasn\'t changed.')
      },
      votingSystem: {
        open: L('{from} wants to change the groups voting system. ', interaction),
        passed: L('The groups voting system changed.'),
        default: L('The groups voting system hasn\'t changed.')
      }
    }
  }
}

export default {
  name: 'MessageInteractive',
  props: {
    id: String,
    time: Date
  },
  components: {
    SvgHorn
  },
  methods: {
    getTime
  },
  computed: {
    interactiveMessage () {
      const summary = chatroom.summary
      let text = ''
      let variant = 'proposal'
      const interaction = fakeProposals[this.id]
      let status = interaction.status
      let proposalStatus = ''
      let proposalSeverity = ''
      if (status !== 'open' && status !== 'passed') status = 'default'
      switch (interaction.status) {
        case STATUS_OPEN:
          proposalStatus = L('New proposal')
          proposalSeverity = 'is-info'
          break

        case STATUS_PASSED:
          proposalStatus = L('Proposal Accepted')
          proposalSeverity = 'is-success'
          break

        case STATUS_FAILED:
          proposalStatus = L('Proposal rejected')
          proposalSeverity = 'is-danger'
          break

        case STATUS_EXPIRED:
        case STATUS_CANCELLED:
          proposalStatus = L('Proposal expired')
          proposalSeverity = 'is-neutral'
          break
      }

      switch (interaction.proposalType) {
        case PROPOSAL_INVITE_MEMBER:
        case PROPOSAL_REMOVE_MEMBER:
          text = interactiveMessage(interaction, summary)[interaction.proposalType][status]
          if (status === 'passed') variant = 'userAction'
          break

        case PROPOSAL_GROUP_SETTING_CHANGE:
        case PROPOSAL_PROPOSAL_SETTING_CHANGE:
          text = interactiveMessage(interaction)[interaction.proposalType][interaction.proposalData.setting][status]
          break

        case interactionType.CHAT_NEW_MEMBER:
          text = L('Added members to this channel: {to}', interaction)
          variant = 'userAction'
          break

        case interactionType.CHAT_REMOVE_MEMBER:
          text = L('Left {title}', summary)
          variant = 'userAction'
          break

        case interactionType.CHAT_NAME_UPDATE:
          text = L('Updated the channel name to: {title}', summary)
          variant = 'userAction'
          break

        case interactionType.CHAT_DESCRIPTION_UPDATE:
          text = L('Updated the channel description to: {title}', summary)
          variant = 'userAction'
          break

        case interactionType.CHAT_DELETE:
          text = L('Deleted the channel: {title}', summary)
          variant = 'tooltip'
          break

        case interactionType.VOTED:
          text = L('Voted on “{}”')
          variant = 'poll'
          break
      }
      return {
        text,
        variant,
        proposalStatus,
        proposalSeverity
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-message {
  display: flex;
  margin: 1rem 0 0;
  align-items: flex-start;
  color: $text_1;
}

.c-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2.5rem;
  height: 2.5rem;
  margin-right: 0.5rem;
  border-radius: 50%;
  background: $primary_2;
}

.c-header {
  display: inline-block;

  .c-title {
    font-size: $size_5;
    margin-right: 0.25rem;
    padding: 0 0.25rem;
    font-family: "Poppins";
    text-transform: uppercase;
  }

  .is-neutral {
    background-color: $general_0;
  }

  .is-info {
    background-color: $primary_2;
    color: $primary_0;
  }

  .is-danger {
    background-color: $danger_2;
    color: $danger_0;
  }

  .is-success {
    background-color: $success_2;
    color: $success_0;
  }
}

.c-link {
  margin-left: .25rem;
  border-bottom: 1px solid $text_1;
  cursor: pointer;
  text-decoration: none;
  font-style: italic;
}
</style>
