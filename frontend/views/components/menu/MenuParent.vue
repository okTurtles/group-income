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
    },
    handleSelect (itemId) {
      this.closeMenu()
      this.$emit('select', itemId)
    },
    closeMenu () {
      this.config.Menu.isActive = false
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
.c-menu {
  position: relative;
}
</style>
