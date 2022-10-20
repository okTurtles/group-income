<template lang='pug'>
component(
  :is='componentData.type'
  v-bind='componentData.props'
)
  template(#cta='')
    .c-all-actions
      i18n.button.is-outlined.is-small(
        tag='span'
        data-test='openAllProposals'
        @click='openModal("PropositionsAllModal")'
      ) Archived proposals

      button-dropdown-menu(
        :buttonText='L("Create proposal")'
        :options='proposalOptions'
        @select='onDropdownItemSelect'
      )

  ul.c-proposals(v-if='hasProposals' data-test='proposalsWidget')
    proposal-item(
      v-for='hash in proposals'
      :key='hash'
      :proposalHash='hash'
    )
    proposal-item(
      v-for='[hash, obj] of ephemeral.archivedProposals'
      :key='hash'
      :proposalHash='hash'
      :proposalObject='obj'
    )

  .c-description(v-else)
    i18n(tag='p') In Group Income, every member of the group gets to vote on important decisions, like removing or adding members, changing the mincome value and others.
    i18n.has-text-1(tag='p') No one has created a proposal yet.
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import SvgVote from '@svgs/vote.svg'
import CalloutCard from '@components/CalloutCard.vue'
import ProposalItem from './ProposalItem.vue'
import PageSection from '@components/PageSection.vue'
import ButtonDropdownMenu from '@components/ButtonDropdownMenu.vue'
import { STATUS_OPEN, PROPOSAL_ARCHIVED } from '@model/contracts/shared/constants.js'
import { OPEN_MODAL } from '@utils/events.js'

export default ({
  name: 'ProposalsWidget',
  components: {
    ProposalItem,
    ButtonDropdownMenu
  },
  mounted () {
    sbp('okTurtles.events/on', PROPOSAL_ARCHIVED, this.onProposalArchived)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', PROPOSAL_ARCHIVED, this.onProposalArchived)
    while (this.ephemeral.timeouts.length > 0) {
      clearTimeout(this.ephemeral.timeouts.pop())
    }
  },
  data () {
    return {
      ephemeral: {
        archivedProposals: [],
        timeouts: []
      }
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'currentIdentityState',
      'groupShouldPropose',
      'groupSettings',
      'ourUsername',
      'groupMembersCount'
    ]),
    hasProposals () {
      return Object.keys(this.currentGroupState.proposals).length > 0 ||
        this.ephemeral.archivedProposals.length > 0
    },
    proposals () {
      const openProposals = Object.entries(this.currentGroupState.proposals)
        .sort((a, b) => {
          return b[1].data.expires_date_ms - a[1].data.expires_date_ms
        })
      return openProposals.map(x => x[0])
    },
    componentData () {
      return {
        type: this.hasProposals ? PageSection : CalloutCard,
        props: this.hasProposals
          ? { title: this.L('Proposals') }
          : {
              title: this.L('Proposals'),
              svg: SvgVote,
              isCard: true
            }
      }
    },
    proposalOptions () {
      const isUserGroupCreator = this.ourUsername === this.groupSettings.groupCreator

      return [
        { type: 'header', name: 'Group Members' },
        { type: 'item', id: 'add-new-member', name: 'Add new member', icon: 'user-plus' },
        {
          type: 'item',
          id: 'remove-member',
          name: 'Remove member',
          icon: 'user-minus',
          isDisabled: this.groupMembersCount < (isUserGroupCreator ? 2 : 3)
        },
        { type: 'header', name: 'Voting Systems' },
        // { type: 'item', id: 'change-disagreeing-number', name: 'Change disagreeing number', icon: 'vote-yea' },
        { type: 'item', id: 'change-to-percentage-base', name: 'Change to percentage base', icon: 'vote-yea' },
        { type: 'header', name: 'Other proposals' },
        { type: 'item', id: 'change-mincome', name: 'Change mincome', icon: 'dollar-sign' },
        {
          type: 'item',
          id: 'generic-proposal',
          name: 'Generic proposal',
          icon: 'envelope-open-text',
          isDisabled: this.groupMembersCount < 3
        }
      ]
    }
  },
  methods: {
    onProposalArchived (hashWithProp) {
      this.ephemeral.archivedProposals.unshift(hashWithProp)
      // after a day, remove it from the list
      this.ephemeral.timeouts.push(setTimeout(() => {
        this.ephemeral.archivedProposals = this.ephemeral.archivedProposals.filter(x => {
          return x[0] !== hashWithProp[0]
        })
      }, 1000 * 60 * 60 * 24)) // 1 day
    },
    hadVoted (proposal) {
      return proposal.votes[this.currentIdentityState.attributes.username] || proposal.status !== STATUS_OPEN
    },
    openModal (modal, queries) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, queries)
    },
    onDropdownItemSelect (itemId) {
      const modalNameMap = {
        'add-new-member': this.groupShouldPropose ? 'AddMembers' : 'InvitationLinkModal',
        'remove-member': 'GroupMembersAllModal',
        'change-mincome': 'MincomeProposal',
        'generic-proposal': 'GenericProposal',
        'change-disagreeing-number': 'ChangeVotingRules',
        'change-to-percentage-base': 'ChangeVotingRules'
      }
      const queries = {
        'change-disagreeing-number': { rule: 'disagreement' },
        'change-to-percentage-base': { rule: 'percentage' },
        'remove-member': { toRemove: true }
      }

      this.openModal(modalNameMap[itemId], queries[itemId] || undefined)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.card {
  position: relative;
}

.c-all-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;

  .c-see-all-proposal-btn {
    font-weight: 400;

    @include phone {
      display: none;
    }
  }

  @include desktop {
    top: 1rem;
  }
}

.c-description p {
  margin-top: 1rem;
}
</style>
