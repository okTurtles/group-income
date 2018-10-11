<template>
  <div class="c-menu">
    <slot></slot>
  </div>
</template>
<style lang="scss" scoped>
.c-menu {
  position: relative;
}
</style>
<script>
export default {
  name: 'MenuSelect',
  data () {
    return {
      config: {
        Menu: {
          isActive: this.isActive,
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
  watch: {
    isActive: {
      immediate: true,
      handler (isActive) {
        this.config.Menu.isActive = isActive
      }
    }
  },
  computed: {
    isActive () {
      return this.config.Menu.isActive
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
}
</script>
