<template lang='pug'>
.c-appearance-settings
  .menu-tile-block
    menu
      ThemeTile
      TextSizeTile
      MenuItem(tabId='reduced-motion')
</template>

<script>
import UserSettingsTabMenuItem from '../UserSettingsTabMenuItem.vue'
import ThemeTile from './ThemeTile.vue'
import TextSizeTile from './TextSizeTile.vue'

export default {
  name: 'AppearanceSettings',
  inject: ['userSettingsTabNames'],
  components: {
    MenuItem: UserSettingsTabMenuItem,
    ThemeTile,
    TextSizeTile
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-appearance-settings {
  position: relative;
}
</style>
