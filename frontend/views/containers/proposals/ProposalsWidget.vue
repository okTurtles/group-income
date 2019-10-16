<template lang='pug'>
ul.c-proposals(data-test='proposalsWidget')
  li.c-empty(v-if='Object.keys(currentGroupState.proposals).length === 0')
    svg-vote.c-svg
    div
      i18n(tag='h3') Proposals
      i18n.c-text(tag='p') In Group Income, every member of the group gets to vote on important decisions, like removing or adding members, changing the mincome value and others.
      i18n.has-text-1(tag='p') No one has created a proposal yet.
  // TODO: view without current proposals
  // TODO: button "see all proposals"
  proposal-box(
    v-else
    v-for='hashes in proposals'
    :key='hashes[0]'
    :proposalHashes='hashes'
  )
</template>

<script>
import { mapGetters } from 'vuex'
import SvgVote from '@svgs/vote.svg'
import ProposalBox from '@containers/proposals/ProposalBox.vue'
import { STATUS_OPEN } from '@model/contracts/voting/proposals.js'

export default {
  name: 'Proposals',
  components: {
    ProposalBox,
    SvgVote
  },
  data () {
    return {
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
      'currentUserIdentityContract'
    ]),
    proposals () {
      if (this.proposalsSorted) {
        return this.proposalsSorted
      }

      const p = this.currentGroupState.proposals
      const sortByExpire = Object.keys(p).sort((prev, curr) => p[curr].data.expires_date_ms - p[prev].data.expires_date_ms)

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
          const placeToAdd = this.hadVoted(p[hash]) ? 'push' : 'unshift'
          proposalsGrouped[proposalsGrouped.length - 1][placeToAdd](hash)
        } else {
          proposalsGrouped.push([hash])
        }
      })
      // Push grouped proposals already voted to the bottom
      // REVIEW: improve sort order, taking in account status as well
      const sortByNotVoted = proposalsGrouped.sort((prev, curr) => {
        return curr.some(hash => this.hadVoted(p[hash])) ? -1 : 1
      })
      this.proposalsSorted = sortByNotVoted // eslint-disable-line vue/no-side-effects-in-computed-properties
      return this.proposalsSorted
    }
  },
  methods: {
    hadVoted (proposal) {
      return proposal.votes[this.currentUserIdentityContract.attributes.name] || proposal.status !== STATUS_OPEN
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-empty {
  display: flex;
}

.c-svg {
  width: 4rem;
  height: 4rem;
  margin-right: $spacer;
  flex-shrink: 0;

  @include widescreen {
    width: 6.25rem;
    height: 6.25rem;
    margin-right: 2.5rem;
  }
}

.c-text {
  margin: $spacer-sm 0;
}
</style>
