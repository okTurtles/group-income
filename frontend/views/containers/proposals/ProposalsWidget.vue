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
    :displayDate='false'
    :proposalHashes='hashes'
  )
</template>

<script>
import SvgVote from '@svgs/vote.svg'
import ProposalBox from '@containers/proposals/ProposalBox.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'Proposals',
  components: {
    ProposalBox,
    SvgVote
  },
  computed: {
    ...mapGetters([
      'currentGroupState'
    ]),
    proposals () {
      // Sort proposals by expering date (most recents at the top)
      // TODO: Filter by only open proposals?
      const p = this.currentGroupState.proposals
      const sortByExpire = Object.keys(p).sort((prev, curr) => p[curr].data.expires_date_ms - p[prev].data.expires_date_ms)

      // HACK/NOTE: Proposals to invite members created at the same time by
      // the same user, should be "visually together". A solution without
      // modifying the store/state is to group the "similiar" proposals in a sub-array.
      // Let's create an Array of Arrays of Strings (hashes).
      const proposalsGrouped = [] // [[hash1], [hash2], [hash3_g, hash4_g]]

      sortByExpire.forEach((hash, index) => {
        if (index === 0) {
          proposalsGrouped.push([hash])
          return
        }

        const current = p[hash]
        const previous = p[sortByExpire[index - 1]]
        const expireSameTime = current.data.expires_date_ms === previous.data.expires_date_ms
        const createdBySameUser = current.meta.username === previous.meta.username
        if (expireSameTime && createdBySameUser) {
          // This proposal should be displayed "visually together" with
          // the previous proposal, so let's group it under the same index.
          proposalsGrouped[proposalsGrouped.length - 1].push(hash)
          return
        }

        proposalsGrouped.push([hash])
      })

      return proposalsGrouped
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
