<template lang='pug'>
summary(
  data-test='menuTrigger'
  :class='{ "button": true, "is-active" : isActive }'
)
  slot(v-if='hideWhenActive ? !isActive : true')
</template>

<script>
export default ({
  name: 'MenuTrigger',
  props: {
    hideWhenActive: Boolean
  },
  inject: ['Menu'],
  computed: {
    isActive () {
      return this.Menu.isActive
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
summary {
  list-style: none;

  &::marker {
    display: none;
  }
}
</style>

