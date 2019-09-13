<template lang='pug'>
//- NOTE: this is obviously ugly markup and needs to be redesigned
//-       it's missing a bunch of stuff.
//-       And also, it's not meant to redirect to /vote (a page
//-       that isn't necessarily even going to be around much longer
.c-proposal-box(:class='[boxClass]')
  i18n(tag='strong' :args='{ type, user: meta.username, desc: description }') Proposal to {type} {desc} from {user}
  | &nbsp;&nbsp;
  i18n(:args='{ for: vYes, against: vNo, indifferent: vIndif }') [{for} for, {against} against, {indifferent} indifferent]
  | &nbsp;&nbsp;
  i18n(:args='{ status }' html='Status: <strong>{status}</strong>')
  | &nbsp;&nbsp;
  router-link.button(
    v-if='!ourVote && status === statuses.STATUS_OPEN'
    :to='{ path: "/vote", query: { groupId: currentGroupId, proposalHash } }'
  )
    i18n Vote here!
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { VOTE_FOR, VOTE_AGAINST, VOTE_INDIFFERENT } from '@model/contracts/voting/rules.js'
import { PROPOSAL_INVITE_MEMBER, PROPOSAL_REMOVE_MEMBER, PROPOSAL_GROUP_SETTING_CHANGE, PROPOSAL_PROPOSAL_SETTING_CHANGE, PROPOSAL_GENERIC, STATUS_OPEN, STATUS_PASSED, STATUS_FAILED, STATUS_EXPIRED, STATUS_WITHDRAWN } from '@model/contracts/voting/proposals.js'

export default {
  name: 'ProposalBox',
  props: {
    proposalHash: String
  },
  components: {
  },
  mounted () {
  },
  data () {
    return {
      ephemeral: {
      }
    }
  },
  computed: {
    proposal () {
      return this.currentGroupState.proposals[this.proposalHash]
    },
    meta () {
      return this.proposal.meta
    },
    type () {
      return this.proposal.data.proposalType
    },
    data () {
      return this.proposal.data.proposalData
    },
    status () {
      return this.proposal.status
    },
    statuses () {
      return { STATUS_OPEN, STATUS_PASSED, STATUS_FAILED, STATUS_EXPIRED, STATUS_WITHDRAWN }
    },
    boxClass () {
      return {
        [STATUS_OPEN]: 'has-background-primary-light',
        [STATUS_PASSED]: 'has-background-success',
        [STATUS_FAILED]: 'has-background-danger',
        [STATUS_EXPIRED]: 'has-background-warning',
        [STATUS_WITHDRAWN]: 'has-background-tertiary'
      }[this.status]
    },
    description () {
      return {
        [PROPOSAL_INVITE_MEMBER]: () => this.data.members.join(', '),
        [PROPOSAL_REMOVE_MEMBER]: () => this.data.member,
        [PROPOSAL_GROUP_SETTING_CHANGE]: () => 'unimplemented',
        [PROPOSAL_PROPOSAL_SETTING_CHANGE]: () => 'unimplemented',
        [PROPOSAL_GENERIC]: () => 'unimplemented'
      }[this.type]()
    },
    ourVote () {
      return this.proposal.votes[this.$store.state.loggedIn.username]
    },
    vYes () {
      return Object.values(this.proposal.votes).filter(x => x === VOTE_FOR).length
    },
    vNo () {
      return Object.values(this.proposal.votes).filter(x => x === VOTE_AGAINST).length
    },
    vIndif () {
      return Object.values(this.proposal.votes).filter(x => x === VOTE_INDIFFERENT).length
    },
    ...mapGetters(['currentGroupState']),
    ...mapState(['currentGroupId'])
  },
  methods: {
  }
}
</script>

<style lang="scss" scoped>
.c-proposal-box {

}
</style>
