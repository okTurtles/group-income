<template lang='pug'>
  avatar(
    :src='pictureURL'
    :alt='alt'
  )
</template>

<script>
import sbp from '~/shared/sbp.js'
import Avatar from '@components/Avatar.vue'

export default {
  name: 'UserImage',
  components: { Avatar },
  props: {
    username: String,
    alt: {
      type: String,
      default: ''
    }
  },
  async mounted () {
    if (!this.profile) {
      const userContractId = await sbp('namespace/lookup', this.username)
      if (!userContractId) {
        console.error(`UserImage: ${this.username} doesn't exist!`)
        return
      }
      const state = await sbp('state/latestContractState', userContractId)
      this.ephemeral.url = state.attributes.picture
    }
  },
  computed: {
    profile () {
      return this.$store.getters.memberProfile(this.username)
    },
    pictureURL () {
      return this.profile ? this.profile.globalProfile.picture : this.ephemeral.url
    }
  },
  data () {
    return {
      ephemeral: {
        url: null
      }
    }
  }
}
</script>
