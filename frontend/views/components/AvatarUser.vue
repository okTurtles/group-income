<template lang='pug'>
  avatar(
    :src='pictureURL'
    :alt='alt'
    :size='size'
  )
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import Avatar from '@components/Avatar.vue'

export default ({
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
    if (!this.profilePicture) {
      console.debug(`Looking for ${this.username} profile picture`)
      const userContractId = await sbp('namespace/lookup', this.username)
      if (!userContractId) {
        console.warn(`AvatarUser: ${this.username} doesn't exist!`)
        return
      }
      const state = await sbp('state/latestContractState', userContractId) || {}
      this.ephemeral.url = state.attributes && state.attributes.picture
    }
  },
  computed: {
    ...mapGetters([
      'ourGroupProfile'
    ]),
    profilePicture () {
      const profile = this.$store.getters.globalProfile(this.username)
      return profile && profile.picture
    },
    pictureURL () {
      return this.profilePicture || this.ephemeral.url
    }
  }
}: Object)
</script>
