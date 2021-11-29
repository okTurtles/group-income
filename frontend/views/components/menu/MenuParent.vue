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
          canClose: true,
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
      this.canClose = false
      setTimeout(() => {
        this.canClose = true
      }, 1000)
    },
    handleSelect (itemId) {
      this.closeMenu()
      this.$emit('select', itemId)
    },
    closeMenu () {
      if (this.canClose) {
        this.config.Menu.isActive = false
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
.c-menu {
  position: relative;
}
</style>
