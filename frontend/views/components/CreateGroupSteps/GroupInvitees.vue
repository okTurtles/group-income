<template lang="pug">
div
  h1
    i18n Invite Members

  .field.has-addons
    .control.is-expanded
      input.input.is-large.is-primary(
        type='text'
        ref='searchUser'
        name='invitee'
        placeholder='Username'
        v-model='searchUser'
        @keyup.enter='addInvitee'
        data-test='searchUser'
      )
    .control
      button(
        @click='addInvitee'
        data-test='addButton'
      )
        i18n Add

  p.content
    i18n Who would you like to include in your group?

  article.message.is-danger(v-if='userErrorMsg')
    .message-body {{ userErrorMsg }}

  .tile.is-ancestor
    .tile.is-4.is-parent.invitee(
      v-for='(invitee, index) in invitees'
      :key='`invitee-${index}`'
      data-test='member'
    )
      .card.tile.is-child
        .card-image
          figure.image.is-square
            img(
              :src='invitee.state.attributes.picture'
              :alt='invitee.state.attributes.name'
            )

        header.card-header
          p.card-header-title {{invitee.state.attributes.name}}

          a.card-header-icon
            button.delete(
              @click='remove(index)'
              data-test='deleteMember'
            )
</template>

<script>
import sbp from '~/shared/sbp.js'
import L from '@view-utils/translations.js'

export default {
  name: 'GroupInvitees',
  props: {
    group: { type: Object }
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
        const contractID = await sbp('namespace/lookup', this.searchUser)
        console.log('contractID:', contractID)
        const state = await sbp('state/latestContractState', contractID)
        if (!this.invitees.find(invitee => invitee.state.attributes.name === this.searchUser)) {
          this.invitees.push({ state, contractID })
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

<style>
  .is-ancestor {
    flex-wrap: wrap;
  }
</style>
