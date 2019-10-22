<template lang='pug'>
loading(theme='fullView' v-if='!ephemeral.contract.settings.groupName')
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-else='')
  template(#title='') {{ L("You've been invited to join a group!") }}
  .card
    h1 {{ephemeral.contract.settings.groupName}}
    p {{ephemeral.contract.settings.sharedValues}}
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
        contract: { members: [], settings: {} },
        errorMsg: null
      }
    }
  },
  async mounted () {
    try {
      const state = await sbp('state/latestContractState', this.$route.query.groupId)
      // TODO: use the state.profiles directly?
      var members = []
      for (const name of Object.keys(state.profiles)) {
        members.push(await sbp('state/latestContractState', state.profiles[name].contractID))
      }

      state.members = members

      // Mocked histoy to show on members-circle
      state.mincomeCurrencySign = '$'
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
        const groupId = this.$route.query.groupId
        const acceptance = await sbp('gi.contracts/group/inviteAccept/create',
          { inviteSecret: this.$route.query.secret },
          groupId
        )
        // let the group know we've accepted their invite
        await sbp('backend/publishLogEntry', acceptance)
        // sync the group's contract state
        await sbp('state/enqueueContractSync', groupId)
        // after syncing, we can set the current group
        this.$store.commit('setCurrentGroupId', groupId)
        this.$router.push({ path: '/' })
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
        const declination = await sbp('gi.contracts/group/inviteDecline/create',
          { inviteSecret: this.$route.query.secret },
          this.$route.query.groupId
        )
        await sbp('backend/publishLogEntry', declination)
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
@import "@assets/style/_variables.scss";
</style>
