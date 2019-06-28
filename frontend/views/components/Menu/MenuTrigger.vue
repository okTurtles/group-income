<template lang="pug">
button(
  v-if='hideWhenActive ? !isActive : true'
  @click='handleClick'
)
  slot
</template>
<script>
export default {
  name: 'MenuTrigger',
  props: {
    hideWhenActive: Boolean
  },
  inject: ['Menu'],
  computed: {
    isActive () {
      return this.Menu.isActive
    }
  },
  methods: {
    handleClick () {
      this.Menu.handleTrigger()
    }
  }
}
</script>
