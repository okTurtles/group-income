<template lang='pug'>
  avatar(
    :src='pictureURL'
    :alt='alt'
    :size='size'
  )
</template>

<script>
import { mapGetters } from 'vuex'
import sbp from '~/shared/sbp.js'
import Avatar from '@components/Avatar.vue'

export default {
  name: 'AvatarUser',
  components: { Avatar },
  props: {
    username: String,
    alt: {
      type: String,
      default: ''
    },
    size: {
      type: String,
      default: 'md',
      validator: (value) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value)
    }
  },
  data () {
    return {
      ephemeral: {
        url: null
      }
    }
  },
  async mounted () {
    if (!this.profile) {
      console.debug(`Looking for ${this.username} profile picture`)
      const userContractId = await sbp('namespace/lookup', this.username)
      if (!userContractId) {
        console.error(`AvatarUser: ${this.username} doesn't exist!`)
        return
      }
      const state = await sbp('state/latestContractState', userContractId)
      this.ephemeral.url = state.attributes.picture
    }
  },
  computed: {
    ...mapGetters([
      'ourGroupProfile'
    ]),
    profilePicture () {
      const profile = this.ourGroupProfile && this.$store.state[this.ourGroupProfile.contractID]
      return profile && profile.attributes && profile.attributes.picture
    },
    pictureURL () {
      return this.profilePicture || this.ephemeral.url
    }
  }
}
</script>
