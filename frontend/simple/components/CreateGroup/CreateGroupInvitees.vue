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
          class="button is-primary is-large"
          @click.prevent="addInvitee"
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

    <div class="box" v-if="invitees.length">
      <div class="media" v-for="(invitee, index) in invitees">
        <div class="media-left">
          <p class="image is-64x64">
            <!-- TODO: use responsive figure:
          http://bulma.io/documentation/elements/image/ -->
            <!-- TODO: ideally these would be loaded from cache -->
            <img :src="invitee.state.attributes.picture" width="64" height="64">
          </p>
        </div>
        <div class="media-content">
          <strong>{{invitee.state.attributes.name}}</strong>
        </div>
        <div class="media-right">
          <button class="delete" @click="remove(index)"></button>
        </div>
      </div>
    </div>

  </div>
</template>
<style lang="scss" scoped>
.table-header {
  background-color: #fafafa;
}
.media {
  align-items: center;
}
.add-form {
  margin-bottom: 2rem;
}
.notification-icon {
  margin-right: 1rem;
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
