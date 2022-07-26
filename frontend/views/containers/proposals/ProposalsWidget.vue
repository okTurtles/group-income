<template lang='pug'>
callout-card(
  v-if='!hasProposals'
  :title='L("Proposals")'
  :svg='SvgVote'
  :isCard='true'
)
  template(#title-cta='')
    .c-all-actions
      i18n.button.is-outlined.is-small.c-see-all-proposal-btn(
        tag='span'
        @click='seeAll'
      ) See all proposals

      button-dropdown-menu(
        :buttonText='L("Create proposal")'
        :options='config.proposalOptions'
      )

  i18n(tag='p') In Group Income, every member of the group gets to vote on important decisions, like removing or adding members, changing the mincome value and others.
  i18n.has-text-1(tag='p') No one has created a proposal yet.

// TODO: view without current proposals
// TODO: button "see all proposals"
page-section(
  v-else
  :title='L("Proposals")'
)
  template(#title-cta='')
    .c-all-actions
      i18n.button.is-outlined.is-small.c-see-all-proposal-btn(
        tag='span'
        @click='seeAll'
      ) See all proposals

      button-dropdown-menu(
        :buttonText='L("Create proposal")'
        :options='config.proposalOptions'
      )

  ul.c-proposals(data-test='proposalsWidget')
    proposal-item(
      v-for='hash in proposals'
      :key='hash'
      :proposalHash='hash'
    )
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import SvgVote from '@svgs/vote.svg'
import CalloutCard from '@components/CalloutCard.vue'
import ProposalItem from './ProposalItem.vue'
import PageSection from '@components/PageSection.vue'
import ButtonDropdownMenu from '@components/ButtonDropdownMenu.vue'
import { STATUS_OPEN } from '@model/contracts/shared/constants.js'
import { OPEN_MODAL } from '@utils/events.js'

export default ({
  name: 'ProposalsWidget',
  components: {
    ProposalItem,
    CalloutCard,
    SvgVote,
    PageSection,
    ButtonDropdownMenu
  },
  data () {
    return {
      SvgVote,
      ephemeral: {
        // Keep initial proposals order even after voting in a proposal
        // That way recently voted proposals don't change position immediatly.
        // Only re-sort this when the user re-visits this component again.
        proposalsSorted: null
      },
      config: {
        proposalOptions: [
          { type: 'header', name: 'Group Members' },
          { type: 'item', id: 'add-new-member', name: 'Add new member', icon: 'comment' },
          { type: 'item', id: 'remove-member', name: 'Remove member', icon: 'comment' },
          { type: 'header', name: 'Voting Systems' },
          { type: 'item', id: 'change-disagreeing-number', name: 'Change disagreeing number', icon: 'comment' },
          { type: 'item', id: 'change-to-percentage-base', name: 'Change to percentage base', icon: 'comment' },
          { type: 'header', name: 'Other proposals' },
          { type: 'item', id: 'change-mincome', name: 'Change mincome', icon: 'comment' },
          { type: 'item', id: 'generic-proposal', name: 'Generic proposal', icon: 'comment' }
        ]
      }
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'currentIdentityState'
    ]),
    hasProposals () {
      return Object.keys(this.currentGroupState.proposals).length > 0
    },
    proposals () {
      if (this.proposalsSorted) {
        return this.proposalsSorted
      }

      const p = this.currentGroupState.proposals
      // TODO/BUG: array.sort doesn't work the same in all browsers.
      const sortByExpire = Object.keys(p) // .stableSort((prev, curr) => p[curr].data.expires_date_ms - p[prev].data.expires_date_ms)

      // HACK/NOTE: Proposals to invite members created at the same time by
      // the same user, should be "visually together". A solution without
      // modifying the store/state is to group the "similiar" proposals in a sub-array.
      const proposalsGrouped = [] // [[hash1], [hash2], [hash3_g, hash4_g]]

      sortByExpire.forEach((hash, index) => {
        if (index === 0) {
          proposalsGrouped.push([hash])
          return
        }

        const current = p[hash]
        const previous = p[sortByExpire[index - 1]]
        const expireAtSameTime = current.data.expires_date_ms === previous.data.expires_date_ms
        const createdBySameUser = current.meta.username === previous.meta.username
        if (expireAtSameTime && createdBySameUser) {
          // This proposal should be displayed "visually together" with
          // the previous proposal, so let's group it under the same index.
          proposalsGrouped[proposalsGrouped.length - 1].push(hash)
        } else {
          proposalsGrouped.push([hash])
        }
      })
      // Push grouped proposals already voted to the bottom
      // REVIEW: improve sort order, taking in account status as well
      // const sortByNotVoted = proposalsGrouped.stableSort((prev, curr) => {
      //   return curr.some(hash => this.hadVoted(p[hash])) ? -1 : 1
      // })
      // this.proposalsSorted = sortByNotVoted // eslint-disable-line vue/no-side-effects-in-computed-properties

      this.proposalsGrouped = proposalsGrouped // eslint-disable-line vue/no-side-effects-in-computed-properties
      return this.proposalsGrouped.flat()
    }
  },
  methods: {
    hadVoted (proposal) {
      return proposal.votes[this.currentIdentityState.attributes.username] || proposal.status !== STATUS_OPEN
    },
    openModal (modal) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal)
    },
    seeAll () {
      // Todo
    },
    createProposal () {
      // Todo: for now, opening 'Generic Proposal' modal. but need to be updated accordingly, once the button is updated as a dropdown of multiple proposal options.
      this.openModal('GenericProposal')
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

  .c-see-all-proposal-btn {
    font-weight: 400;

    @include phone {
      display: none;
    }
  }
}
</style>
