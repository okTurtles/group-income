<template>
 <img :src="picture">
</template>
<script>
import {HapiNamespace} from '../js/backend/hapi'
import {latestContractState} from '../js/state'
var namespace = new HapiNamespace()
export default{
  name: 'ProfilePicture',
  props: ['username'],
  mounted: function () {
    this.fetchData()
  },
  methods: {
    fetchData: async function () {
      if (this.username === this.$store.state.loggedIn) {
        this.picture = this.$store.state[this.$store.getters.identity].attributes.picture
      }
      let identity = await namespace.lookup(this.username)
      if (this.$store.state.contracts[identity]) {
        this.picture = this.$store.state[identity].attributes.picture
      } else {
        let state = await latestContractState(identity)
        this.picture = state.attributes.picture
      }
    }
  },
  data () {
    return {
      picture: ''
    }
  }
}

</script>
