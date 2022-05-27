<template lang='pug'>
message-base(v-bind='$props' @wrapperAction='action')
  template(#image='')
    .c-icon
      svg-horn
  template(#header='')
    .c-header
      span.c-title.is-title-5(:class='interactiveMessage.proposalSeverity') {{interactiveMessage.proposalStatus}}
      span.has-text-1 {{ humanDate(datetime, { hour: 'numeric', minute: 'numeric' }) }}
  template(#body='')
    .c-text
      | {{interactiveMessage.text}}
      i18n.c-link See proposal
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
  STATUS_CANCELLED,
  L,
  humanDate
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path

import MessageBase from './MessageBase.vue'
import SvgHorn from '@svgs/horn.svg'
import chatroom from '@containers/chatroom/chatroom.js'

const fakeProposals = {
  inviteKattyId: {
    proposalType: PROPOSAL_INVITE_MEMBER,
    proposalData: {
      member: 'Katty',
      reason: 'She\'s cool'
    },
    status: STATUS_FAILED,
    from: '555',
    to: '444'
  },
  changeMincomeId: {
    proposalType: PROPOSAL_GROUP_SETTING_CHANGE,
    status: STATUS_PASSED,
    proposalData: {
      setting: 'mincomeAmount',
      proposedValue: 300,
      currentValue: 200,
      mincomeCurrency: 'USD',
      reason: 'Because why not'
    }
  },
  changeVotingRuleId: {
    proposalType: PROPOSAL_PROPOSAL_SETTING_CHANGE,
    status: STATUS_EXPIRED,
    proposalData: {
      setting: 'votingRule'
    }
  },
  changeVotingSystemId: {
    proposalType: PROPOSAL_PROPOSAL_SETTING_CHANGE,
    status: STATUS_CANCELLED,
    proposalData: {
      setting: 'votingSystem'
    }
  }
}

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

export default ({
  name: 'MessageInteractive',
  props: {
    id: String,
    datetime: Date
  },
  components: {
    SvgHorn,
    MessageBase
  },
  methods: {
    humanDate,
    action () {
      console.log('TODO')
    }
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
      }
      return {
        text,
        variant,
        proposalStatus,
        proposalSeverity
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

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
  margin-left: 0.25rem;
  border-bottom: 1px solid $text_1;
  cursor: pointer;
  text-decoration: none;
  font-style: italic;
}
</style>
