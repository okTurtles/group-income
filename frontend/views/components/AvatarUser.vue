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
    picture: {
      type: [String, Object]
    },
    contractID: {
      type: String
    },
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
      console.debug(`Looking for ${this.contractID} profile picture`)
      const state = await sbp('chelonia/latestContractState', this.contractID) || {}
      this.ephemeral.url = state.attributes && state.attributes.picture
    }
  },
  computed: {
    ...mapGetters(['globalProfile']),
    profilePicture () {
      const profile = this.globalProfile(this.contractID)
      return this.picture || (profile && profile.picture)
    },
    pictureURL () {
      return this.profilePicture || this.ephemeral.url
    }
  }
}: Object)
</script>
