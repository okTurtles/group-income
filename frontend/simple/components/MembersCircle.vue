<template>
  <div>
    <ul class='circle-container'>
      <li v-for="member in members"><img :src='member.picture'></li>
    </ul>
  </div>
</template>
<style lang="scss" scoped>

</style>
<script>
import {mapGetters} from 'vuex'
export default {
  name: 'MembersCircle',
  mounted () {
    console.log('currentGroup:', this.currentGroup)
    console.log('members:', this.members)
  },
  methods: {

  },
  computed: {
    members () { return this.$store.getters.membersForGroup },
    ...mapGetters(['currentGroup'])
  },
  data () {
    return {}
  }
}
</script>
