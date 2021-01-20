<template lang='pug'>
button(
  v-if='hideWhenActive ? !isActive : true'
  :aria-pressed='isActive ? "true" : "false"'
  data-test='menuTrigger'
  :class='{ "is-active" : isActive }'
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
