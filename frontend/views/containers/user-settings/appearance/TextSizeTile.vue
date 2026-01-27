<template lang='pug'>
MenuItem(
  tabId='text-size'
  :isExpandable='true'
  @expand='refreshSlider'
)
  template(#info='')
    span.has-text-1 {{ currentSizeName }}

  template(#lower='')
    .c-slider-container
      Slider(
        :value='fontSize'
        :data='fontData'
        :range='fontRange'
        @input='setFontSize($event)'
        ref='slider'
      )
</template>

<script>
import { L } from '@common/common.js'
import { mapGetters, mapMutations } from 'vuex'
import UserSettingsTabMenuItem from '../UserSettingsTabMenuItem.vue'
import Slider from '@components/Slider.vue'

const sizeOptionNames = {
  '14': L('Small'),
  '16': L('Medium'),
  '18': L('Large'),
  '20': L('Extra large')
}

export default {
  name: 'TextSizeTile',
  inject: ['userSettingsTabNames'],
  components: {
    MenuItem: UserSettingsTabMenuItem,
    Slider
  },
  data () {
    return {
      config: {
        sizeOptionNames
      },
      fontVariations: 4,
      fontRange: [],
      fontData: []
    }
  },
  methods: {
    ...mapMutations([
      'setFontSize'
    ]),
    refreshSlider () {
      this.$refs.slider?.refresh()
    }
  },
  computed: {
    ...mapGetters([
      'fontSize'
    ]),
    currentSizeName () {
      return this.config.sizeOptionNames[`${this.fontSize}`]
    }
  },
  watch: {
    fontSize () {
      this.refreshSlider()
    }
  },
  created () {
    let size = 14
    for (let index = 0; index < this.fontVariations; index++) {
      // Add data to the slider
      this.fontData.push(size)
      size += 2

      // Hise one label out of two
      this.fontRange.push({
        label: 'Aa'
      })
    }
  }
}
</script>
