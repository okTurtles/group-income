<template>
  <div>
    <h1><i18n>Invite Members</i18n></h1>
    <input
      type="text"
      name="invitee"
      class="input"
      v-model="currentInvitee"
    >
    <button
      @click.prevent="addInvitee()"
    >
      <i18n>Add</i18n>
    </button>
    <ul>
      <li v-for="invitee in invitees">{{ invitee }}</li>
    </ul>
    <p><i18n>Who would you like to include in your group?</i18n></p>
  </div>
</template>
<script>
export default {
  name: 'CreateGroupInvitees',
  props: {
    value: {type: Array}
  },
  data: function () {
    return {
      invitees: this.value,
      currentInvitee: ''
    }
  },
  methods: {
    addInvitee: function () {
      this.invitees.push(this.currentInvitee)
      this.currentInvitee = ''
      this.$emit('input', this.invitees)
    }
  }
}
</script>
