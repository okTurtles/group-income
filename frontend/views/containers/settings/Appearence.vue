<template lang='pug'>
  .settings-container
    section.card
      h2.settings-subtitle Theme

      SelectorTheme

    section.card
      h2.settings-subtitle Reduced Motion

      label
        input(type='checkbox' :checked='$store.state.reducedMotion' @change='handleCheckbox')
        i18n Reduced motion
        .help When enabled the amount of animations you see around are reduced.

    section.card
      h2.settings-subtitle Text settings

      //- TODO in separate tickets
      //- SelectorFontSize

      .preview
        h3.title Text size preview
        p.para Group Income (n) is an efficient, fair, decentralized Basic Income system for you and your friends.
</template>

<script>
import { mapMutations } from 'vuex'
import SelectorTheme from '@components/Settings/Theme.vue'
// import SelectorFontSize from '@components/Settings/FontSize.vue'

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
@import "../../../assets/style/_variables.scss";

.settings-container {
  @include tablet {
    padding-top: 1.5rem;
  }
}

.preview {
  padding-top: 2px;

  .title {
    margin: 0 0 6px 0;
    font-size: 0.875rem;

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
