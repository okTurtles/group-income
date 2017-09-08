<template>
  <section class="section full-screen">
    <div class="columns">
      <div class="column"></div>
      <div class="column" style="text-align: center" >
        <div>
          <div class="subtitle is-3"><i18n>Your vote has been requested on a proposal for the group:</i18n></div>
          <div class="title is-1">{{contract.groupName}}</div>
        </div>
        <div class="panel">
          <div class="panel-block">
            <div style="display: inline;">
             {{proposal.proposal}}
            </div>
          </div>
          <div class="panel-block notification is-warning" style="text-align: center">
            <strong style="margin: 0 auto"><i18n>Your Decision?</i18n></strong>
          </div>
          <div class="panel-block center" style="display: block; text-align: center">
            <div id="errorMsg" v-if="errorMsg" class="help is-danger">{{errorMsg}}</div>
            <a id="ForLink" class="button is-success is-large" v-on:click="four" style="margin-left:auto; margin-right: 20px"><i18n>For</i18n></a><a id="AgainstLink" class="button is-danger is-large" v-on:click="against" style="margin-right:auto; margin-right: 20px"><i18n>Against</i18n></a>
          </div>
        </div>
      </div>
      <div class="column"></div>
    </div>
  </section>
</template>
<script>
import {transactionQueue, Transaction} from '../js/transactions'
import L from '../js/translations'
import _ from 'lodash'
import sbp from '../../../shared/sbp'
export default {
  name: 'Vote',
  computed: {
    contract () {
      return this.$store.state[this.$route.query.groupId] || {proposals: {}}
    },
    proposal () {
      return this.contract.proposals[this.$route.query.proposalHash] || {proposal: null}
    },
    memberCount () {
      return this.$store.getters[`${this.$route.query.groupId}/memberUsernames`].length
    }
  },
  methods: {
    async four () { // for is a reserved word so Vue doesn't like it
      try {
        this.errorMsg = null
        let proposal = _.cloneDeep(this.proposal)
        let threshold = Math.ceil(proposal.percentage * this.memberCount)
        await sbp('transactions/v1/run', `Vote For Proposal ${this.$route.query.proposalHash}`, true, [
          { execute: 'setInScope', args: { username: this.$store.state.loggedIn.name, proposalHash: this.$route.query.proposalHash, groupId: this.$route.query.groupId } },
          {
            execute: 'contracts/v1/group/voteForProposal',
            description: `Vote For Proposal ${this.$route.query.proposalHash}`,
            args: {
              username: 'username',
              proposalHash: 'proposalHash',
              groupId: 'groupId'
            }
          }
        ])
        if (proposal.for.length + 1 >= threshold) {
          let proposedTransaction = Transaction.fromJSON(JSON.parse(proposal.transaction))
          proposedTransaction.setInScope('voteDate', new Date().toString())
          transactionQueue.run(proposedTransaction)
          await proposedTransaction.wait()
        }
        // return to mailbox
        this.$router.push({path: '/mailbox'})
      } catch (ex) {
        console.log(ex)
        // TODO: Create More descriptive errors
        this.errorMsg = L('Failed to Cast Vote')
      }
    },
    async against () {
      try {
        this.errorMsg = null
        await sbp('transactions/v1/run', `Vote Against Proposal ${this.$route.query.proposalHash}`, true, [
          { execute: 'setInScope', args: { username: this.$store.state.loggedIn.name, proposalHash: this.$route.query.proposalHash, groupId: this.$route.query.groupId } },
          {
            execute: 'contracts/v1/identity/voteAgainstProposal',
            description: `Vote For Proposal ${this.$route.query.proposalHash}`,
            args: {
              username: 'username',
              proposalHash: 'proposalHash',
              groupId: 'groupId'
            }
          }
        ])
        this.$router.push({path: '/mailbox'})
      } catch (ex) {
        console.error(ex)
        // TODO: Create More descriptive errors
        this.errorMsg = L('Failed to Cast Vote')
      }
    }
  },
  data () {
    return {
      errorMsg: null
    }
  }
}
</script>
