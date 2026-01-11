<template lang='pug'>
button.is-unstyled.menu-tile.c-menu-tile(
  @click.stop='navigateToTab(item.id)'
  :class='"is-style-" + variant'
)
  .tile-text {{ menuName }}
  i.icon-chevron-right.tile-icon
</template>

<script>
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

export default {
  name: 'GroupSettingsTabMenuItem',
  inject: ['groupSettingsTabNames'],
  props: {
    tabId: {
      type: String,
      required: true
    },
    variant: {
      type: String,
      default: 'default',
      validator: v => ['default', 'danger'].includes(v)
    }
  },
  computed: {
    menuName () {
      return this.groupSettingsTabNames[this.tabId] || ''
    }
  },
  methods: {
    navigateToTab (tabId) {
      this.$router.push({
        name: 'GroupSettingsNewTab',
        params: { tabId }
      }).catch(logExceptNavigationDuplicated)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-menu-tile {
  position: relative;
}
</style>
