<template>
  <loading theme="fullView" v-if="!contract.groupName" />
  <main class="gi-join-grid" v-else>
    <div class="gi-join-grid-header">
      <h1 class="has-text-grey">
        <i18n>You’ve been invited to join a group!</i18n>
      </h1>
      <h2 class="title is-1 is-marginless">{{contract.groupName}}</h2>
      <h3 class="is-size-5">{{contract.sharedValues}}</h3>
    </div>
    <div class="gi-join-grid-ctas">
      <div class="buttons">
        <button
          class="button is-large is-primary"
          data-test="acceptLink"
          v-on:click="accept">
          Join Group
        </button>
        <button
          class="button is-large is-outlined"
          data-test="declineLink"
          v-on:click="decline">
          No, thanks
        </button>
      </div>
      <p v-if="errorMsg" class="has-text-danger has-text-centered-mobile">{{errorMsg}}</p>
    </div>
    <div class="gi-join-grid-graphic" v-if="contract.members.length">
      <members-circle :members="contract.members">
        <bars
          :currency="contract.incomeCurrencySign"
          :history="contract.history"
          :mincome="contract.incomeProvided" />
      </members-circle>
    </div>
  </div>
  </main>
</template>
<style lang="scss" scoped>
@import "../sass/theme/index";
@import "../sass/bulma_overrides/components/navbar";

.gi-join {
  &-grid {
    display: grid;
    grid-template-areas: "header" "graphic" "ctas";
    grid-gap: $gi-spacer-lg;
    padding: $gi-spacer-lg $gi-spacer;
    max-width: $widescreen;
    min-height: calc(100vh - #{$navbar-height});
    margin: auto;

    &-header {
      grid-area: header;
      align-self: self-end;
    }

    &-ctas {
      grid-area: ctas;
    }

    &-graphic {
      grid-area: graphic;
      justify-self: center;
      align-self: center;
    }

    @include mobile {
      justify-items: center;

      &-header,
      &-graphic {
        text-align: center;
      }
    }

    @include tablet {
      grid-gap: $gi-spacer-xl $gi-spacer;
      grid-template-columns: 50% 50%;
      grid-template-rows: auto;
      grid-template-areas: "header graphic" "ctas graphic";
      padding: $gi-spacer-lg;
    }
  }
}

.buttons {
  &:not(:last-child) {
    margin-bottom: 0;
  }

  .button:not(:last-child) {
    margin-right: $gi-spacer;
  }

  @include mobile {
    .button {
      font-size: $size-6; // force to be default size on mobile
    }
  }
}
</style>
<script>
import * as Events from '../../../shared/events'
import backend from '../js/backend/'
import { latestContractState } from '../js/state'
import L from '../js/translations'
import Bars from '../components/Graphs/Bars.vue'
import Loading from '../components/Loading.vue'
import MembersCircle from '../components/MembersCircle.vue'

export default {
  name: 'Join',
  components: {
    Bars,
    Loading,
    MembersCircle
  },
  async mounted () {
    try {
      let state = await latestContractState(this.$route.query.groupId)
      if (!state.invitees.find(invitee => invitee === this.$store.state.loggedIn.name)) {
        // TODO: proper user-facing error
        // TODO: somehow I got this error... I created 4 accounts, and after inviting
        //       the 4th one, there was an exception thrown by HashableGroupVoteAgainstProposal
        //       when account 2 or 3 voted against the proposal. Yet the invite still appeared
        //       in 4's inbox. But clicking it just resulted in this error when clicking
        //       "Respond to Invite". Furthermore, the Invite wouldn't disappear from the Inbox
        console.log(new Error('Invalid Invitation'))
        this.$router.push({path: '/mailbox'})
      }
      // TODO: use the state.profiles directly?
      var members = []
      for (const name of Object.keys(state.profiles)) {
        members.push(await latestContractState(state.profiles[name].contractId))
      }

      state.members = members

      // Mocked histoy to show on members-circle
      state.incomeCurrencySign = '$'
      state.history = [1.1, 1.3, 0.7, 1.05, 1, 1.3]

      this.contract = state
    } catch (ex) {
      // TODO Add ui facing error notification
      console.log(ex)
      this.$router.push({path: '/mailbox'})
    }
  },
  methods: {
    accept: async function () {
      try {
        // post acceptance event to the group contract
        this.errorMsg = null
        let latest = await backend.latestHash(this.$route.query.groupId)
        let acceptance = new Events.HashableGroupAcceptInvitation(
          {
            username: this.$store.state.loggedIn.name,
            identityContractId: this.$store.state.loggedIn.identityContractId,
            inviteHash: this.$route.query.inviteHash,
            acceptanceDate: new Date()
          },
          latest
        )
        // let the group know we've accepted their invite
        await backend.publishLogEntry(this.$route.query.groupId, acceptance)
        // sync the group's contract state
        await this.$store.dispatch('syncContractWithServer', this.$route.query.groupId)
        // after syncing, we can set the current group
        this.$store.commit('setCurrentGroupId', this.$route.query.groupId)

        // remove invite and return to mailbox
        this.$store.commit('deleteMessage', this.$route.query.inviteHash)
        this.$router.push({path: '/mailbox'})
      } catch (ex) {
        console.log(ex)
        // TODO: post this to a global notification system instead of using this.errorMsg
        this.errorMsg = L('Failed to Accept Invite')
      }
    },
    decline: async function () {
      try {
        // post decline event
        this.errorMsg = null
        let latest = await backend.latestHash(this.$route.query.groupId)
        let declination = new Events.HashableGroupDeclineInvitation(
          {
            username: this.$store.state.loggedIn.name,
            inviteHash: this.$route.query.inviteHash,
            declinedDate: new Date()
          },
          latest
        )
        await backend.publishLogEntry(this.$route.query.groupId, declination)

        // remove invite and return to mailbox
        this.$store.commit('deleteMail', this.$route.query.inviteHash)
        this.$router.push({path: '/mailbox'})
      } catch (ex) {
        console.log(ex)
        this.errorMsg = L('Failed to Decline Invite')
      }
    }
  },
  data () {
    return {
      errorMsg: null,
      contract: { members: [] }
    }
  }
}
</script>
