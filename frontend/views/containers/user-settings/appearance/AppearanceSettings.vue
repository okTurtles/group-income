<template lang='pug'>
.c-appearance-settings
  .menu-tile-block
    menu
      ThemeTile
      MenuItem(tabId='text-size')
      MenuItem(tabId='reduced-motion')
</template>

<script>
import { L } from '@common/common.js'
import { mapGetters, mapMutations } from 'vuex'
import UserSettingsTabMenuItem from '../UserSettingsTabMenuItem.vue'
import ThemeTile from './ThemeTile.vue'

export default {
  name: 'AppearanceSettings',
  inject: ['userSettingsTabNames'],
  components: {
    MenuItem: UserSettingsTabMenuItem,
    ThemeTile
  },
  data () {
    return {
      config: {
        themeValueNames: {
          'light': L('Light'),
          'dark': L('Dark'),
          'system': L('System')
        }
      }
    }
  },
  computed: {
    ...mapGetters(['theme'])
  },
  methods: {
    ...mapMutations(['setTheme'])
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-appearance-settings {
  position: relative;
}
</style>
