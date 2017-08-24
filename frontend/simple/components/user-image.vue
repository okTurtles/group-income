<template>
    <img :src="pictureURL">
</template>
<script>
import {namespace} from '../js/backend/hapi'
import {latestContractState} from '../js/state'
export default {
  name: 'UserImage',
  props: ['username'],
  async mounted () {
    if (!this.profile) {
      let userContractId = await namespace.lookup(this.username)
      let state = await latestContractState(userContractId)
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
