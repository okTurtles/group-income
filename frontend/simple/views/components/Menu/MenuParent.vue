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
      Menu: {
        isActive: this.isActive,
        handleSelect: this.handleSelect,
        handleTrigger: this.handleTrigger,
        closeMenu: this.closeMenu
      }
    }
  },
  provide () {
    return {
      Menu: this.Menu
    }
  },
  watch: {
    isActive: {
      immediate: true,
      handler (isActive) {
        this.Menu.isActive = isActive
      }
    }
  },
  computed: {
    isActive () {
      return this.Menu.isActive
    }
  },
  methods: {
    handleTrigger () {
      this.Menu.isActive = true
    },
    handleSelect (itemId) {
      this.closeMenu()
      this.$emit('select', itemId)
    },
    closeMenu () {
      this.Menu.isActive = false
    }
  }
}
</script>
