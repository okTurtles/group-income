<template lang='pug'>
.theme-list
  fieldset.theme(@click.prevent='setTheme("system")')
    label(for='system')
      .c-combined-color
        ThemeSvg(:color='themes.light')
        ThemeSvg(:color='themes.dark')

      .radio
        input.input(type='radio' name='theme' value='system' id='system' v-model='theme')
        i18n(tag='span') Use system settings

  fieldset.theme(v-for='(color, label) in themes' :key='label' @click.prevent='setTheme(label)')
    label(:for='label')
      .c-color
        ThemeSvg(:color='color')

      .radio
        input.input(type='radio' name='theme' :value='label' :id='label' v-model='theme')
        span {{ label }}
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import Themes from '@model/colors.js'
import ThemeSvg from './ThemeSvg.vue'
import colorsMixins from '@view-utils/colorsManipulation.js'

export default ({
  name: 'SelectorTheme',

  mixins: [colorsMixins],

  data () {
    return {
      themes: Themes
    }
  },

  components: {
    ThemeSvg
  },

  methods: {
    ...mapMutations([
      'setTheme'
    ])
  },

  computed: {
    ...mapGetters([
      'colors',
      'theme'
    ])
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.theme-list {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  column-gap: 0.75rem;
}

.radio {
  margin-top: 0.5rem;
}

.theme {
  margin-bottom: 1.125rem;

  &:hover {
    .c-combined-color,
    .c-color {
      transform: scale(1.05);
    }
  }
}

.c-combined-color,
.c-color {
  transition: all 250ms cubic-bezier(0.4, 0.25, 0.3, 1);
  border: 1px solid $general_0;
  border-radius: 0.25rem;
  overflow: hidden;
}

.c-combined-color {
  display: flex;

  svg {
    margin-right: -50%;
  }
}
</style>
