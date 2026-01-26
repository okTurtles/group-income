<template lang='pug'>
MenuItem(tabId='theme' :isExpandable='true')
  template(#info='')
    span.has-text-1 {{ config.themeValueNames[theme] }}

  template(#lower='')
    .c-theme-list
      fieldset.c-theme-item(@click.prevent='setTheme("system")')
        label(for='system')
          .c-combined-color
            ThemeSvg(:color='config.themes.light')
            ThemeSvg(:color='config.themes.dark')

          .radio.c-radio
            input.input(type='radio' name='theme' value='system' id='system' v-model='theme')
            i18n(tag='span') Use system settings

      fieldset.c-theme-item(v-for='(color, label) in config.themes' :key='label' @click.prevent='setTheme(label)')
        label(:for='label')
          .c-color
            ThemeSvg(:color='color')

        .radio.c-radio
          input.input(type='radio' name='theme' :value='label' :id='label' v-model='theme')
          span {{ config.themeValueNames[label] }}
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import { L } from '@common/common.js'
import UserSettingsTabMenuItem from './UserSettingsTabMenuItem.vue'
import Themes from '~/frontend/model/settings/colors.js'
import ThemeSvg from './ThemeSvg.vue'

export default {
  name: 'ThemeTile',
  inject: ['userSettingsTabNames'],
  components: {
    MenuItem: UserSettingsTabMenuItem,
    ThemeSvg
  },
  data () {
    return {
      config: {
        themeValueNames: {
          'light': L('Light'),
          'dark': L('Dark'),
          'system': L('System')
        },
        themes: Themes
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

.c-theme-list {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1rem;

  @include from($tablet) {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
}

.c-radio {
  margin-top: 0.5rem;
}

.c-theme-item {
  max-width: 9.75rem;

  &:hover {
    .c-combined-color,
    .c-color {
      transform: scale(1.05);
    }
  }

  @include from($tablet) {
    max-width: unset;
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
