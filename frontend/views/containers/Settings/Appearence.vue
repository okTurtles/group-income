<template lang='pug'>
  .settings-container
    section
      h2.settings-subtitle.is-size-5 Theme

      SelectorTheme

    section
      h2.settings-subtitle.is-size-5 Text settings

      //- TODO in separate tickets
      //- SelectorFontSize

      .preview
        h3.title Text size preview
        p.para Group Income (n) is an efficient, fair, decentralized Basic Income system for you and your friends.

</template>

<script>
import SelectorTheme from '../../components/Settings/Theme.vue'
// import SelectorFontSize from '../../components/Settings/FontSize.vue'

export default {
  name: 'SettingsAppearence',

  components: {
    SelectorTheme
  //   SelectorFontSize
  }
}
</script>

<style lang='scss' scoped>
@import "../../../assets/sass/theme/index";

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
