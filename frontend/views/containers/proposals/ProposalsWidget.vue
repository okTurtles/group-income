<template lang='pug'>
  callout-card(
    v-if='!hasProposals'
    :title='L("Proposals")'
    :svg='SvgVote'
    :isCard='true'
  )
    i18n(tag='p') In Group Income, every member of the group gets to vote on important decisions, like removing or adding members, changing the mincome value and others.
    i18n.has-text-1(tag='p') No one has created a proposal yet.

  page-section.c-page-section(
    v-else
    :title='L("Proposals")'
  )
    template(#cta='')
      // TODO: implement "See all proposals"
      .c-proposal-btns
        // TODO: below button has to be replaced with a dropdown button (see: https://github.com/okTurtles/group-income/issues/1288#issuecomment-1155061508)
        i18n.is-outlined.is-small(
          tag='button'
          @click='openModal("GenericProposal")'
        ) Create general proposal

    ul.c-proposals(data-test='proposalsWidget')
      proposal-box(
        v-for='hashes in proposals'
        :key='hashes[0]'
        :proposalHashes='hashes'
      )
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import SvgVote from '@svgs/vote.svg'
import CalloutCard from '@components/CalloutCard.vue'
import ProposalBox from '@containers/proposals/ProposalBox.vue'
import PageSection from '@components/PageSection.vue'
import { STATUS_OPEN } from '@model/contracts/voting/constants.js'
import { OPEN_MODAL } from '@utils/events.js'

export default ({
  name: 'ProposalsWidget',
  components: {
    ProposalBox,
    CalloutCard,
    SvgVote,
    PageSection
  },
  data () {
    return {
      SvgVote,
      ephemeral: {
        // Keep initial proposals order even after voting in a proposal
        // That way recently voted proposals don't change position immediatly.
        // Only re-sort this when the user re-visits this component again.
        proposalsSorted: null
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

      return this.proposalsGrouped
    }
  },
  methods: {
    hadVoted (proposal) {
      return proposal.votes[this.currentIdentityState.attributes.username] || proposal.status !== STATUS_OPEN
    },
    openModal (modal) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
.c-page-section {
  ::v-deep .c-proposal-btns {
    button:not(:last-child) {
      margin-right: 0.75rem;
    }
  }
}
</style>
