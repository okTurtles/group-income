<template lang='pug'>
ul.c-proposals
  li.c-empty(v-if='Object.keys(currentGroupState.proposals).length === 0')
    svg-vote.c-svg
    div
      i18n(tag='h3') Proposals
      i18n.c-text(tag='p') In Group Income, every member of the group gets to vote on important decisions, like removing or adding members, changing the mincome value and others.
      i18n.has-text-1(tag='p') No one has created a proposal yet.
      // TODO: no current proposals
  // TODO: button "see all proposals"
  // TOD2: - sort proposals by date.
  proposal-box(
    v-else
    v-for='(proposal, hash) in currentGroupState.proposals'
    :key='hash'
    :proposalHash='hash'
  )
</template>

<script>
import SvgVote from '@svgs/vote.svg'
import ProposalBox from '@components/Proposals/ProposalBox.vue'
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
    ])
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

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
