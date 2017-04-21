<template>
  <img v-bind:src="picture">
</template>
<script>
import {HapiNamespace} from '../js/backend/hapi'
import {latestContractState} from '../js/state'
var namespace = new HapiNamespace()
let pictures = new WeakMap()
export default{
  name: 'picture',
  props: {
    username: 'string'
  },
  computed: {
    picture: async function () {
      if (this.username === this.$store.stated.loggedIn) {
        return this.$store.state[this.$store.getters.identity].attributes.picture
      }
      let identity = await namespace.lookup(this.username)
      if (this.$store.state.contracts[identity]) {
        return this.$store.state[identity].attributes.picture
      } else if (pictures.has(identity)) {
        return pictures.get(identity)
      } else {
        let state = await latestContractState(identity)
        return state.attributes.picture
      }
    }
  }
}

</script>
