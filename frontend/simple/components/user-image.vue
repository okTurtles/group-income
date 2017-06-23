<template>
    <img :src="url">
</template>
<script>
import {namespace} from '../js/backend/hapi'
import { latestContractState } from '../js/state'
export default {
  name: 'UserImage',
  props: ['username'],
  async mounted () {
    let userContractId = await namespace.lookup(this.username)
    if (this.$store.state[userContractId]) {
      this.url = this.$store.state[userContractId].attributes.picture
    } else {
      let state = await latestContractState(userContractId)
      this.url = state.attributes.picture
    }
  },
  data () {
    return {
      url: null
    }
  }
}
</script>
