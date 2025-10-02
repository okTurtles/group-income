<template lang='pug'>
component(
  :is='componentData.type'
  v-bind='componentData.props'
  :class='{ "c-has-extra-bottom-margin": ephemeral.isMenuOpen }'
  data-test='proposalsSection'
)
  template(#cta='')
    .c-all-actions
      i18n.button.is-outlined.is-small(
        tag='span'
        data-test='openAllProposals'
        @click='openModal("PropositionsAllModal")'
      ) Archived proposals

      button-dropdown-menu.c-proposals-menu(
        :buttonText='L("Create proposal")'
        :options='proposalOptions'
        @select='onDropdownItemSelect'
        @menu-open='onMenuOpen'
        @menu-close='onMenuClose'
        :boundEdge='ephemeral.isPhone ? "left" : "right"'
      )

  ul.c-proposals(v-if='hasProposals' data-test='proposalsWidget')
    proposal-item(
      v-for='hash in proposals'
      :key='`proposal-${hash}`'
      :proposalHash='hash'
    )
    proposal-item(
      v-for='[hash, obj] of ephemeral.archivedProposals'
      :key='`archived-proposal-${hash}`'
      :proposalHash='hash'
      :proposalObject='obj'
    )

  .c-description(v-else)
    i18n(tag='p') In Group Income, every member of the group gets to vote on important decisions, like removing or adding members, changing the mincome value and others.
    i18n.has-text-1(tag='p') There are no open proposals.
</template>

<script>
import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import SvgVote from '@svgs/vote.svg'
import CalloutCard from '@components/CalloutCard.vue'
import ProposalItem from './ProposalItem.vue'
import PageSection from '@components/PageSection.vue'
import ButtonDropdownMenu from '@components/ButtonDropdownMenu.vue'
import { STATUS_OPEN, PROPOSAL_ARCHIVED } from '@model/contracts/shared/constants.js'
import { DAYS_MILLIS } from '@model/contracts/shared/time.js'
import { OPEN_MODAL } from '@utils/events.js'
import { L } from '@common/common.js'

export default ({
  name: 'ProposalsWidget',
  components: {
    ProposalItem,
    ButtonDropdownMenu
  },
  mounted () {
    this.refreshArchivedProposals()
    sbp('okTurtles.events/on', PROPOSAL_ARCHIVED, this.onProposalArchived)

    this.matchMediaPhone = window.matchMedia('screen and (max-width: 515px)')
    this.ephemeral.isPhone = this.matchMediaPhone.matches
    this.matchMediaPhone.onchange = (e) => {
      this.ephemeral.isPhone = e.matches
    }
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', PROPOSAL_ARCHIVED, this.onProposalArchived)
    this.matchMediaPhone.onchange = null
    this.clearTimeouts()
  },
  data () {
    return {
      matchMediaPhone: null,
      ephemeral: {
        archivedProposals: [],
        timeouts: [],
        isPhone: false,
        isMenuOpen: false
      }
    }
  },
  computed: {
    ...mapState(['currentGroupId']),
    ...mapGetters([
      'currentGroupState',
      'currentWelcomeInvite',
      'currentIdentityState',
      'groupDistributionStarted',
      'groupShouldPropose',
      'currentGroupOwnerID',
      'ourIdentityContractId',
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
          ? {
              title: L('Proposals'),
              anchor: 'proposals'
            }
          : {
              title: L('Proposals'),
              anchor: 'proposals',
              svg: SvgVote,
              isCard: true
            }
      }
    },
    proposalOptions () {
      const isUserGroupCreator = this.ourIdentityContractId === this.currentGroupOwnerID
      const defaultDisableConfig = !this.groupShouldPropose && !isUserGroupCreator

      return [
        { type: 'header', name: L('Group Members') },
        { type: 'item', id: 'add-new-member', name: L('Add new member'), icon: 'user-plus' },
        {
          type: 'item',
          id: 'remove-member',
          name: L('Remove member'),
          icon: 'user-minus',
          isDisabled: this.groupMembersCount < (isUserGroupCreator ? 2 : 3)
        },
        { type: 'header', name: L('Voting Systems') },
        // { type: 'item', id: 'change-disagreeing-number', name: 'Change disagreeing number', icon: 'vote-yea' },
        {
          type: 'item',
          id: 'change-voting-threshold',
          name: L('Change voting threshold'),
          icon: 'vote-yea',
          isDisabled: defaultDisableConfig
        },
        { type: 'header', name: L('Other Proposals') },
        {
          type: 'item',
          id: 'change-mincome',
          name: L('Change mincome'),
          icon: 'dollar-sign',
          isDisabled: defaultDisableConfig
        },
        {
          type: 'item',
          id: 'change-distribution-date',
          name: L('Change distribution date'),
          icon: 'chart-pie',
          isDisabled: this.groupDistributionStarted(new Date().toISOString()) || defaultDisableConfig
        },
        {
          type: 'item',
          id: 'generic-proposal',
          name: L('Generic proposal'),
          icon: 'envelope-open-text',
          isDisabled: !this.groupShouldPropose
        }
      ]
    }
  },
  methods: {
    onProposalArchived (groupId, hash, proposal) {
      if (groupId === this.currentGroupId) {
        this.ephemeral.archivedProposals.unshift([hash, proposal])
        this.ephemeral.timeouts.push(setTimeout(() => {
          this.ephemeral.archivedProposals = this.ephemeral.archivedProposals.filter(x => x[0] !== hash)
        }, new Date(proposal.dateClosed).getTime() - Date.now() + DAYS_MILLIS))
      }
    },
    async refreshArchivedProposals () {
      // NOTE: all the archived proposals are displayed in the dashboard widget for 24 hours
      //       https://github.com/okTurtles/group-income/pull/1723#discussion_r1323369824
      const key = `proposals/${this.ourIdentityContractId}/${this.currentGroupId}`
      const archivedProposals = await sbp('gi.db/archive/load', key) || []
      // proposals which are archived in the last 24 hours
      this.ephemeral.archivedProposals = archivedProposals
        .filter(([hash, prop]) => Date.now() - new Date(prop.dateClosed).getTime() < DAYS_MILLIS)
        .sort(([hash1, prop1], [hash2, prop2]) => new Date(prop2.dateClosed).getTime() - new Date(prop1.dateClosed).getTime())
      // after a day, remove it from the list
      this.clearTimeouts()
      for (const [hash, proposal] of this.ephemeral.archivedProposals) {
        this.ephemeral.timeouts.push(setTimeout(() => {
          this.ephemeral.archivedProposals = this.ephemeral.archivedProposals.filter(x => x[0] !== hash)
        }, new Date(proposal.dateClosed).getTime() - Date.now() + DAYS_MILLIS))
      }
    },
    clearTimeouts () {
      while (this.ephemeral.timeouts.length > 0) {
        clearTimeout(this.ephemeral.timeouts.pop())
      }
    },
    hadVoted (proposal) {
      return proposal.votes[this.currentIdentityState.attributes.username] || proposal.status !== STATUS_OPEN
    },
    openModal (modal, queries) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, queries)
    },
    onDropdownItemSelect (itemId) {
      const modalNameMap = {
        'add-new-member': 'InvitationLinkModal',
        'remove-member': 'GroupMembersAllModal',
        'change-mincome': 'MincomeProposal',
        'change-distribution-date': 'DistributionDateProposal',
        'generic-proposal': 'GenericProposal',
        'change-disagreeing-number': 'ChangeVotingRules',
        'change-voting-threshold': 'ChangeVotingRules'
      }
      const queries = {
        'change-disagreeing-number': { rule: 'disagreement' },
        'change-voting-threshold': { rule: 'percentage' },
        'remove-member': { toRemove: true }
      }

      const isWelcomeInviteExpired = this.currentWelcomeInvite.expires < Date.now()
      if (itemId === 'add-new-member' && (this.groupShouldPropose || isWelcomeInviteExpired)) {
        return sbp('gi.app/group/checkGroupSizeAndProposeMember', { contractID: this.$store.state.currentGroupId })
      }

      this.openModal(modalNameMap[itemId], queries[itemId] || undefined)
    },
    onMenuOpen () {
      this.ephemeral.isMenuOpen = true

      this.$nextTick(() => {
        const proposalsMenu = document.querySelector('.c-proposals-menu')
        if (proposalsMenu) {
          proposalsMenu.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },
    onMenuClose () {
      this.ephemeral.isMenuOpen = false
    }
  },
  watch: {
    currentGroupId () {
      this.refreshArchivedProposals()
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
  align-items: baseline;

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

.c-has-extra-bottom-margin {
  margin-bottom: 12rem;
}
</style>
