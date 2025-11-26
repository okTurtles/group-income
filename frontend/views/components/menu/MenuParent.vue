<template lang='pug'>
  details.c-menu(:ref='"details"' @toggle='handleToggle')
    slot
</template>

<script>
export default ({
  name: 'MenuParent',
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
    handleToggle (e) {
      if (this.config.Menu.isActive === e.target.open) return
      this.config.Menu.isActive = e.target.open
      // Because this handler relies on the native 'toggle' event, this should
      // work every time the menu is opened or closed. Hence, the custom event
      // is emitted here for reliability and doing it in `closeMenu` or
      // `handleTrigger` (or `handleSelect`, which implies `closeMenu`) is
      // redundant.
      this.$emit(this.config.Menu.isActive ? 'menu-open' : 'menu-close')
    },
    handleTrigger () {
      this.$refs.details.open = true
    },
    handleSelect (itemId) {
      this.closeMenu()
      this.$emit('select', itemId)
    },
    closeMenu () {
      this.$refs.details.open = false
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
.c-menu {
  position: relative;
}
</style>
