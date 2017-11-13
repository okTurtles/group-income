<template>
  <div>
    <h1><i18n>Invite Members</i18n></h1>
    <input
      type="text"
      name="invitee"
      class="input"
      v-model="searchUser"
      ref="searchUser"
    >
    <button
      @click.prevent="addInvitee()"
    >
      <i18n>Add</i18n>
    </button>

    <p><i18n>Who would you like to include in your group?</i18n></p>

    <p v-if="userErrorMsg" class="help is-danger">{{ userErrorMsg }}</p>

    <table
            class="table is-bordered is-striped is-narrow"
            v-if="invitees.length"
    >
      <thead>
      <tr>
        <th class="table-header"><i18n>Initial Invitees</i18n></th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="(invitee, index) in invitees" class="member">
        <td>
          <div class="media">
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
        </td>
      </tr>
      </tbody>
    </table>

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
    value: {type: Array}
  },
  mounted () {
    this.$refs.searchUser.focus()
  },
  data: function () {
    return {
      invitees: this.value,
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
        this.$emit('input', this.invitees)
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
