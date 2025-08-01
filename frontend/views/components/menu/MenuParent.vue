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
      // Weird browser bug
      if (e.oldState === e.newState) {
        e.target.open = !e.target.open
        return
      }
      if (this.config.Menu.isActive === e.target.open) return
      this.config.Menu.isActive = e.target.open
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
