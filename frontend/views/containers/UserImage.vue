<template lang="pug">
  avatar(
    :src='pictureURL'
    :alt='username'
  )
</template>

<script>
import sbp from '~/shared/sbp.js'
import Avatar from '@components/Avatar.vue'

export default {
  name: 'UserImage',
  components: { Avatar },
  props: ['username'],
  async mounted () {
    if (!this.profile) {
      let userContractId = await sbp('namespace/lookup', this.username)
      let state = await sbp('state/latestContractState', userContractId)
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
