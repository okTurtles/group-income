<template lang='pug'>
div(
  data-test='invitees'
  )
  i18n(tag='h1') Invite Members

  i18n.label(tag='label') Who would you like to include in your group?

  .input-combo
    input.input(
      type='text'
      ref='searchUser'
      name='invitee'
      placeholder='Username'
      v-model='searchUser'
      @keyup.enter='addInvitee'
      data-test='searchUser'
    )
    i18n(
      tag='button'
      type='button'
      @click='addInvitee'
      data-test='addButton'
    ) Add

  p.error(v-if='userErrorMsg') {{ userErrorMsg }}

  .invitee(
    v-for='(invitee, index) in invitees'
    :key='`invitee-${index}`'
    data-test='member'
  )
    avatar(
      :src='invitee.state.attributes.picture'
      :alt='invitee.state.attributes.name'
    )

    p {{invitee.state.attributes.name}}

    button.is-icon(
      @click='remove(index)'
      data-test='deleteMember'
    )
      i.icon-times-circle
</template>

<script>
// TODO: delete both this file and Invite.vue
import sbp from '~/shared/sbp.js'
import L from '@view-utils/translations.js'
import Avatar from '@components/Avatar.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'GroupInvitees',
  props: {
    group: { type: Object }
  },
  components: {
    Avatar
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
  computed: {
    ...mapGetters(['ourUsername'])
  },
  methods: {
    async addInvitee () {
      if (!this.searchUser) return

      if (this.searchUser === this.ourUsername) {
        this.userErrorMsg = L("Invalid User: Cannot Invite One's self")
        return
      } else {
        this.userErrorMsg = ''
      }

      try {
        const contractID = await sbp('namespace/lookup', this.searchUser)
        if (!contractID) {
          this.userErrorMsg = L("User doesn't exist: {username}", { username: this.searchUser })
          return
        }
        const state = await sbp('state/latestContractState', contractID)
        if (!this.invitees.find(invitee => invitee.state.attributes.name === this.searchUser)) {
          this.invitees.push({ state, contractID })
        }
        this.searchUser = null
        this.userErrorMsg = ''
        this.$emit('input', { data: { invitees: this.invitees } })
      } catch (err) {
        console.error(err)
        this.userErrorMsg = err.message
      }
    },
    remove (index) {
      this.invitees.splice(index, 1)
    }
  }
}
</script>

<style lang="scss" scoped>

.invitee {
  display: flex;
  align-items: center;
  justify-content: space-between;

  p {
    margin-right: auto;
    margin-left: 1rem;
  }
}
</style>
