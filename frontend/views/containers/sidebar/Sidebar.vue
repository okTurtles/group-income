<template lang="pug">
aside.p-sidebar(:class="{ 'is-active': ephemeral.isActive }")
  toggle(@toggle='toggleMenu' element='sidebar')
  slot
</template>

<script>
import Toggle from '@containers/sidebar/Toggle.vue'

export default {
  name: 'Sidebar',
  components: {
    Toggle
  },
  data () {
    return {
      ephemeral: {
        isActive: false
      }
    }
  },
  methods: {
    toggleMenu () {
      this.ephemeral.isActive = !this.ephemeral.isActive
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";
</style>
