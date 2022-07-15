<template lang='pug'>
.theme-list
  fieldset.theme(v-for='(color, label) in themes' :key='label' @click='setTheme(color.name)')
    label(:for='label')
      svg(width='247' height='128' viewBox='0 0 247 128' fill='none' xmlns='http://www.w3.org/2000/svg')
        path(d='M243 0.5C244.933 0.5 246.5 2.067 246.5 4V124C246.5 125.933 244.933 127.5 243 127.5H4C2.06701 127.5 0.5 125.933 0.5 124V4C0.5 2.067 2.067 0.5 4 0.5H243Z' :fill='color.general_2' :stroke='color.general_0')
        rect(x='24' y='28' width='48' height='9' rx='4.5' :fill='color.general_0')
        rect(x='24' y='48' width='48' height='9' rx='4.5' :fill='color.general_0')
        rect(x='24' y='68' width='48' height='9' rx='4.5' :fill='color.general_0')
        rect(x='24' y='88' width='48' height='9' rx='4.5' :fill='color.general_0')
        path(d='M86 32C86 29.7909 87.7909 28 90 28H246V123C246 125.209 244.209 127 242 127H86V32Z' :fill='color.background_0')
        circle(cx='12.5' cy='32.5' r='4.5' :fill='color.primary_0')
        circle(cx='12.5' cy='52.5' r='4.5' :fill='color.primary_0')
        circle(cx='12.5' cy='72.5' r='4.5' :fill='color.primary_0')
        rect(x='8' y='8.00002' width='64' height='9' rx='4.5' :fill='color.general_0')
        circle(cx='12.5' cy='92.5' r='4.5' :fill='color.primary_0')

      .radio
        input.input(type='radio' name='theme' :value='label' :id='label' v-model='colors.name')
        span {{ label }}
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import Themes from '~/frontend/model/colors.js'
import colorsMixins from '@view-utils/colorsManipulation.js'

export default ({
  name: 'SelectorTheme',

  mixins: [colorsMixins],

  data () {
    return {
      themes: Themes
    }
  },

  methods: {
    ...mapMutations([
      'setTheme'
    ])
  },

  computed: {
    ...mapGetters([
      'colors'
    ])
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.theme-list {
  display: flex;
  justify-content: space-between;
}

.theme {
  margin-bottom: 1.125rem;
  width: calc(50% - 0.75rem);

  &:hover {
    svg {
      transform: scale(1.05);
    }
  }
}

svg {
  display: block;
  transition: all 250ms cubic-bezier(0.4, 0.25, 0.3, 1);
  margin-bottom: 0.5rem;
  width: 100%;
  height: auto;
}
</style>
