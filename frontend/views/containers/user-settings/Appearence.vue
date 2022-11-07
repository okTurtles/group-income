<template lang='pug'>
  .settings-container
    section.card
      i18n.is-title-2.c-title(tag='h2') Theme
      SelectorTheme

      //- .c-subcontent
      //-   .c-text-content
      //-     i18n.c-smaller-title(tag='h3') Use high-contrast colors
      //-     i18n.help(tag='p') Increases contrast and improves readability
      //-   label
      //-     i18n.sr-only Increases contrast
      //-     input.switch(
      //-       type='checkbox'
      //-       name='switch'
      //-       :checked='$store.state.increaseContrast'
      //-       @change='handleIncreasedContrast'
      //-     )

      i18n.is-title-2.c-title(tag='h2') Text size
      SelectorFontSize

      i18n.is-title-2.c-title(tag='h2') Animations
      .c-subcontent
        .c-text-content
          i18n.c-smaller-title(tag='h3') Reduced Motion
          i18n.help(tag='p') When enabled the amount of animations you see around are reduced.
        label
          i18n.sr-only Reduced motion
          input.switch(
            type='checkbox'
            name='switch'
            :checked='$store.state.settings.reducedMotion'
            @change='handleReducedMotion'
          )
</template>

<script>
import { mapMutations } from 'vuex'
import SelectorTheme from './Theme.vue'
import SelectorFontSize from './FontSize.vue'

export default ({
  name: 'SettingsAppearence',
  components: {
    SelectorTheme,
    SelectorFontSize
  },
  methods: {
    ...mapMutations([
      'setReducedMotion',
      'setIncreasedContrast'
    ]),
    handleIncreasedContrast (e) {
      this.setIncreasesContrast(e.target.checked)
    },
    handleReducedMotion (e) {
      this.setReducedMotion(e.target.checked)
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.settings-container {
  width: 100%;

  @include desktop {
    padding-top: 1.5rem;
  }

  .c-title {
    margin-bottom: 1rem;
  }
}

.c-subcontent {
  border: none;
  display: flex;
  justify-content: space-between;
  margin-bottom: 2.5rem;

  &:last-child {
    margin-bottom: 1.5rem;
  }
}

.c-smaller-title {
  font-size: $size_4;
  font-weight: bold;
}
</style>
