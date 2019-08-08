<template lang="pug">
loading(theme='fullView' v-if='!ephemeral.contract.groupName')
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-else='')
  template(#title='') You&rsquo;ve been invited to join a group!
  .p-section
    h1 {{ephemeral.contract.groupName}}
    p {{ephemeral.contract.sharedValues}}

    .c-join-grid-graphic(v-if='ephemeral.contract.members.length')
      members-circle(:members='ephemeral.contract.members')
        bars(:currency='ephemeral.contract.incomeCurrencySign' :history='ephemeral.contract.history' :mincome='+ephemeral.contract.incomeProvided')

    p.error(v-if='ephemeral.errorMsg') {{ephemeral.errorMsg}}

    .buttons
      i18n.is-outlined(
        tag='button'
        data-test='declineLink'
        v-on:click='decline'
      )  No, thanks
      i18n(
        tag='button'
        data-test='acceptLink'
        v-on:click='accept'
      ) Join Group
</template>

<script>
import sbp from '~/shared/sbp.js'
import L from '@view-utils/translations.js'
import Page from './Page.vue'
import Bars from '@components/Graphs/Bars.vue'
import Loading from '@components/Loading.vue'
import MembersCircle from '@components/MembersCircle.vue'

export default {
  name: 'Join',
  components: {
    Bars,
    Loading,
    MembersCircle,
    Page
  },
  data () {
    return {
      ephemeral: {
        contract: { members: [] },
        errorMsg: null
      }
    }
  },
  async mounted () {
    try {
      const state = await sbp('state/latestContractState', this.$route.query.groupId)
      if (!state.invitees.find(invitee => invitee === this.$store.state.loggedIn.name)) {
        // TODO: proper user-facing error
        // TODO: somehow I got this error... I created 4 accounts, and after inviting
        //       the 4th one, there was an exception thrown by HashableGroupVoteAgainstProposal
        //       when account 2 or 3 voted against the proposal. Yet the invite still appeared
        //       in 4's inbox. But clicking it just resulted in this error when clicking
        //       "Respond to Invite". Furthermore, the Invite wouldn't disappear from the Inbox
        console.log(new Error('Invalid Invitation'))
        this.$router.push({ path: '/mailbox' })
      }
      // TODO: use the state.profiles directly?
      var members = []
      for (const name of Object.keys(state.profiles)) {
        members.push(await sbp('state/latestContractState', state.profiles[name].contractID))
      }

      state.members = members

      // Mocked histoy to show on members-circle
      state.incomeCurrencySign = '$'
      state.history = [1.1, 1.3, 0.7, 1.05, 1, 1.3]

      this.ephemeral.contract = state
    } catch (ex) {
      // TODO Add ui facing error notification
      console.log(ex)
      this.$router.push({ path: '/mailbox' })
    }
  },
  methods: {
    accept: async function () {
      try {
        // post acceptance event to the group contract
        this.ephemeral.errorMsg = null
        const acceptance = await sbp('gi/contract/create-action', 'GroupAcceptInvitation',
          {
            username: this.$store.state.loggedIn.name,
            identityContractId: this.$store.state.loggedIn.identityContractId,
            inviteHash: this.$route.query.inviteHash,
            acceptanceDate: new Date().toISOString()
          },
          this.$route.query.groupId
        )
        // let the group know we've accepted their invite
        await sbp('backend/publishLogEntry', acceptance)
        // sync the group's contract state
        await this.$store.dispatch('syncContractWithServer', this.$route.query.groupId)
        // after syncing, we can set the current group
        this.$store.commit('setCurrentGroupId', this.$route.query.groupId)

        // remove invite and return to mailbox
        this.$store.commit('deleteMessage', this.$route.query.inviteHash)
        this.$router.push({ path: '/mailbox' })
      } catch (ex) {
        console.log(ex)
        // TODO: post this to a global notification system instead of using this.ephemeral.errorMsg
        this.ephemeral.errorMsg = L('Failed to Accept Invite')
      }
    },
    decline: async function () {
      try {
        // post decline event
        this.ephemeral.errorMsg = null
        const declination = await sbp('gi/contract/create-action', 'GroupDeclineInvitation',
          {
            username: this.$store.state.loggedIn.name,
            inviteHash: this.$route.query.inviteHash,
            declinedDate: new Date().toISOString()
          },
          this.$route.query.groupId
        )
        await sbp('backend/publishLogEntry', declination)

        // remove invite and return to mailbox
        this.$store.commit('deleteMail', this.$route.query.inviteHash)
        this.$router.push({ path: '/mailbox' })
      } catch (ex) {
        console.log(ex)
        this.ephemeral.errorMsg = L('Failed to Decline Invite')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";
</style>
