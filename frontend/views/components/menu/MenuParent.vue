<template lang='pug'>
  .c-menu
    slot
</template>

<script>
export default ({
  name: 'MenuSelect',
  data () {
    return {
      config: {
        Menu: {
          isActive: false,
          handleSelect: this.handleSelect,
          handleTrigger: this.handleTrigger,
          closeMenu: this.closeMenu
        }
      }
    }
  },
  provide () {
    return {
      Menu: this.config.Menu
    }
  },
  methods: {
    handleTrigger () {
      this.config.Menu.isActive = true
      this.$emit(this.config.Menu.isActive ? 'menu-open' : 'menu-close')
    },
    handleSelect (itemId) {
      this.closeMenu()
      this.$emit('select', itemId)
    },
    closeMenu () {
      this.config.Menu.isActive = false
      this.$emit('menu-close')
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
.c-menu {
  position: relative;
}
</style>
