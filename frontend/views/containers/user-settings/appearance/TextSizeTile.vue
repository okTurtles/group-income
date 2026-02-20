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
import { textSizeOptions } from '@view-utils/textSizes.js'

export default {
  name: 'TextSizeTile',
  inject: ['userSettingsTabNames'],
  components: {
    MenuItem: UserSettingsTabMenuItem,
    Slider
  },
  data () {
    return {
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
      return textSizeOptions.find(option => option.value === this.fontSize)?.label || ''
    }
  },
  watch: {
    fontSize () {
      this.refreshSlider()
    }
  },
  created () {
    this.fontData = textSizeOptions.map(option => option.value).sort((a, b) => a - b)
    this.fontRange = this.fontData.map((_) => ({ label: 'Aa' }))
  }
}
</script>

<style lang="scss" scoped>
.c-slider-container {
  padding: 0 0.75rem;
}
</style>
