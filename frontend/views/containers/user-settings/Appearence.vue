<template lang='pug'>
  .settings-container
    section.card
      h2.is-title-3.c-title Theme

      SelectorTheme

    section.card
      h2.is-title-3.c-title Reduced Motion

      label.checkbox
        input(type='checkbox' :checked='$store.state.reducedMotion' @change='handleCheckbox')
        i18n Reduced motion
      i18n.help(tag='p') When enabled the amount of animations you see around are reduced.

    section.card
      h2.is-title-3.c-title Text settings

      //- TODO in separate tickets
      //- SelectorFontSize

      .preview
        p.is-title-4 Text size preview
        p.para Group Income (n) is an efficient, fair, decentralized Basic Income system for you and your friends.
</template>

<script>
import { mapMutations } from 'vuex'
import SelectorTheme from './Theme.vue'
// import SelectorFontSize from './FontSize.vue'

export default {
  name: 'SettingsAppearence',
  components: {
    SelectorTheme
    //   SelectorFontSize
  },
  methods: {
    ...mapMutations([
      'setReducedMotion'
    ]),
    handleCheckbox (e) {
      this.setReducedMotion(e.target.checked)
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.settings-container {
  @include tablet {
    padding-top: 1.5rem;
  }

  .c-title {
    margin-bottom: 1.5rem;
  }
}

.preview {
  .is-title-4 {
    margin: 0 0 6px 0;
    font-size: $size_5;

    @include tablet {
      margin-left: 0;
    }
  }

  .para {
    margin: 0 0 50px 0;
    width: 450px;
    max-width: calc(100% - 45px);
    line-height: 20px;
    letter-spacing: 0.1px;
  }
}
</style>
