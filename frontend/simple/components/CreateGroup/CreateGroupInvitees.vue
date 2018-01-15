<template>
  <div>
    <h1 class="title is-2 has-text-centered"><i18n>Invite Members</i18n></h1>
    <div class="field has-addons">
      <div class="control is-expanded">
        <input
          class="input is-large is-primary"
          placeholder="Username"
          name="invitee"
          type="text"
          v-model="searchUser"
          ref="searchUser"
          @keyup.enter="addInvitee"
        >
      </div>
      <div class="control">
        <button
          id="addButton"
          class="button is-primary is-large"
          @click="addInvitee"
        >
          <i18n>Add</i18n>
        </button>
      </div>
    </div>

    <p class="content"><i18n>Who would you like to include in your group?</i18n></p>

    <article class="message is-danger" v-if="userErrorMsg">
      <div class="message-body">
        {{ userErrorMsg }}
      </div>
    </article>

    <div class="tile is-ancestor">
      <div class="tile is-4 is-parent invitee" v-for="(invitee, index) in invitees">
        <div class="card tile is-child">
          <div class="card-image">
            <figure class="image is-square">
              <img :src="invitee.state.attributes.picture" :alt="invitee.state.attributes.name">
            </figure>
          </div>
          <header class="card-header">
            <p class="card-header-title">
              {{invitee.state.attributes.name}}
            </p>
            <a class="card-header-icon">
              <button class="delete" @click="remove(index)"></button>
            </a>
          </header>
        </div>
      </div>
    </div>

  </div>
</template>
<style>
  .tile.is-ancestor {
    flex-wrap: wrap;
  }
</style>
<script>
import { latestContractState } from '../../js/state'
import { namespace } from '../../js/backend/hapi'
import L from '../../js/translations'

export default {
  name: 'CreateGroupInvitees',
  props: {
    group: {type: Object}
  },
  mounted () {
    this.$refs.searchUser.focus()
  },
  data: function () {
    return {
      invitees: this.group.invitees,
      searchUser: '',
      userErrorMsg: ''
    }
  },
  methods: {
    async addInvitee () {
      if (!this.searchUser) return

      if (this.searchUser === this.$store.state.loggedIn.name) {
        this.userErrorMsg = L('Invalid User: Cannot Invite One\'s self')
        return
      } else {
        this.userErrorMsg = ''
      }

      try {
        const contractId = await namespace.lookup(this.searchUser)
        console.log('contractId:', contractId)
        const state = await latestContractState(contractId)
        if (!this.invitees.find(invitee => invitee.state.attributes.name === this.searchUser)) {
          this.invitees.push({ state, contractId })
        }
        this.searchUser = null
        this.userErrorMsg = ''
        this.$emit('input', { data: { invitees: this.invitees } })
      } catch (err) {
        console.log(err)
        this.userErrorMsg = L('Invalid User')
      }
    },
    remove (index) {
      this.invitees.splice(index, 1)
    }
  }
}
</script>
