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
          label
            i18n.sr-only Reduced motion
            input.switch.is-small.c-switch(
              type='checkbox'
              name='switch'
              :checked='$store.state.settings.reducedMotion'
              @change='handleReducedMotion'
              @click.stop=''
            )

        template(#lower='')
          .c-reduced-motion-content
            i18n.has-text-1(tag='p') When enabled the amount of animations you see around are reduced.

      MenuItem(
        v-if='increasedContrastEnabled'
        tabId='increased-contrast'
        :isExpandable='true'
      )
        template(#info='')
          label
            i18n.sr-only Increases contrast
            input.switch.is-small.c-switch(
              type='checkbox'
              name='switch'
              :checked='$store.state.settings.increasedContrast'
              @change='handleIncreasedContrast'
              @click.stop=''
            )

        template(#lower='')
          .c-increased-contrast-content
            i18n.c-smaller-title(tag='h3') Use high-contrast colors
            i18n.has-text-1(tag='p') Increases contrast and improves readability.

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
  computed: {
    increasedContrastEnabled () {
      // This was commented out in the original user-settings page, so keeping it here disabled for now.
      return false
    }
  },
  methods: {
    ...mapMutations([
      'setReducedMotion',
      'setIncreasedContrast'
    ]),
    handleReducedMotion (e) {
      this.setReducedMotion(e.target.checked)
    },
    handleIncreasedContrast (e) {
      this.setIncreasedContrast(e.target.checked)
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

.c-smaller-title {
  font-size: $size_4;
  font-weight: bold;
}
</style>
