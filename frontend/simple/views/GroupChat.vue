<template>
  <main>
    <div class="section is-hero">
      <i18n tag="h1" class="title is-4 is-marginless">
        Chat
      </i18n>
    </div>

    <p>Group Chat for <b>{{currentGroupState.groupName}}</b> on the way...</p>
  </main>
</template>
<style lang="scss" scoped>
@import "../assets/sass/theme/index";
</style>
<script>
import { mapGetters } from 'vuex'

export default {
  name: 'GroupChat',
  components: {},
  data () {
    return {}
  },
  computed: {
    ...mapGetters([
      'currentGroupState'
    ])
  },
  methods: {}
}
</script>
