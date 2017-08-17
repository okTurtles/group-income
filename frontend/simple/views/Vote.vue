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
import * as invariants from '../js/invariants'
import {transactionQueue, createExternalStateTransaction, Transaction} from '../js/transactions'
import L from '../js/translations'
import _ from 'lodash'
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
      return this.$store.getters[`${this.$route.query.groupId}/members`].length
    }
  },
  methods: {
    async four () { // for is a reserved word so Vue doesn't like it
      this.errorMsg = null
      console.log('happened')
      let proposal = _.cloneDeep(this.proposal)
      let threshold = Math.ceil(proposal.percentage * this.memberCount)
      // Create a vote for the proposal
      let externalTransaction = createExternalStateTransaction(`Vote For Proposal ${this.$route.query.proposalHash}`)
      externalTransaction.setInScope('username', this.$store.state.loggedIn.name)
      externalTransaction.setInScope('proposalHash', this.$route.query.proposalHash)
      externalTransaction.setInScope('groupId', this.$route.query.groupId)
      externalTransaction.addStep({
        execute: invariants.voteForProposal,
        description: `Vote For Proposal ${this.$route.query.proposalHash}`,
        args: {
          backend: 'backend',
          Events: 'Events',
          username: 'username',
          proposalHash: 'proposalHash',
          groupId: 'groupId'
        }
      })
      let onError = (ex) => {
        externalTransaction.removeAllListeners('complete')
        console.error(ex)
        // TODO: Create More descriptive errors
        this.errorMsg = L('Failed to Cast Vote')
      }
      externalTransaction.once('error', onError)
      externalTransaction.once('complete', () => {
        if (proposal.for.length + 1 >= threshold) {
          try {
            console.log(JSON.parse(proposal.transaction))
            console.log(Transaction.isTransaction(JSON.parse(proposal.transaction)))
            let proposedTransaction = Transaction.fromJSON(JSON.parse(proposal.transaction))
            proposedTransaction.setInScope('voteDate', new Date().toString())
            proposedTransaction.once('error', onError)
            // return to mailbox
            proposedTransaction.once('complete', () => this.$router.push({path: '/mailbox'}))
            transactionQueue.run(proposedTransaction)
          } catch (ex) {
            onError(ex)
          }
        } else {
          // return to mailbox
          this.$router.push({path: '/mailbox'})
        }
      })
      transactionQueue.run(externalTransaction)
    },
    async against () {
      this.errorMsg = null
      // Create a vote for the proposal
      let externalTransaction = createExternalStateTransaction(`Vote For Proposal ${this.$route.query.proposalHash}`)
      externalTransaction.setInScope('username', this.$store.state.loggedIn.name)
      externalTransaction.setInScope('proposalHash', this.$route.query.proposalHash)
      externalTransaction.setInScope('groupId', this.$route.query.groupId)
      externalTransaction.addStep({
        execute: invariants.voteAgainstProposal,
        description: `Vote Against Proposal ${this.$route.query.proposalHash}`,
        args: {
          backend: 'backend',
          Events: 'Events',
          username: 'username',
          proposalHash: 'proposalHash',
          groupId: 'groupId'
        }
      })
      externalTransaction.once('error', (ex) => {
        externalTransaction.removeAllListeners('complete')
        console.error(ex)
        // TODO: Create More descriptive errors
        this.errorMsg = L('Failed to Cast Vote')
      })
      externalTransaction.once('complete', () => {
        // return to mailbox
        this.$router.push({path: '/mailbox'})
      })
      transactionQueue.run(externalTransaction)
    }
  },
  data () {
    return {
      errorMsg: null
    }
  }
}
</script>
