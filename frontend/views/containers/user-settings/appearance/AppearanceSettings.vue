<template lang='pug'>
.c-appearance-settings
  .menu-tile-block
    menu
      ThemeTile
      TextSizeTile
      MenuItem(
        tabId='reduced-motion'
        :isExpandable='true'
      )
        template(#info='')
          input.switch.is-small.c-switch(
            type='checkbox'
            name='switch'
            :checked='$store.state.settings.reducedMotion'
            @change='handleReducedMotion'
            @click.stop=''
          )
</template>

<script>
import { mapMutations } from 'vuex'
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
  },
  methods: {
    ...mapMutations([
      'setReducedMotion'
    ]),
    handleReducedMotion (e) {
      this.setReducedMotion(e.target.checked)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-appearance-settings {
  position: relative;
}

input.c-switch {
  vertical-align: middle;
}
</style>
