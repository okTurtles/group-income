<template lang='pug'>
MenuItem(
  tabId='text-size'
  :isExpandable='true'
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
import { mapGetters, mapMutations } from 'vuex'
import UserSettingsTabMenuItem from '../UserSettingsTabMenuItem.vue'
import Slider from '@components/Slider.vue'
import { sizeOptions } from '@model/settings/textsizes.js'

export default {
  name: 'TextSizeTile',
  inject: ['userSettingsTabNames'],
  components: {
    MenuItem: UserSettingsTabMenuItem,
    Slider
  },
  data () {
    return {
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
      const sizeNameMap = Object.fromEntries(sizeOptions.map(option => [`${option.value}`, option.label]))
      return sizeNameMap[`${this.fontSize}`]
    }
  },
  watch: {
    fontSize () {
      this.refreshSlider()
    }
  },
  created () {
    this.fontData = sizeOptions.map(option => option.value).sort((a, b) => a - b)
    this.fontRange = this.fontData.map((_) => ({ label: 'Aa' }))
  }
}
</script>

<style lang="scss" scoped>
.c-slider-container {
  padding: 0 0.75rem;
}
</style>
