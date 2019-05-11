<template lang='pug'>
AppSlider(
  :value="fontSize"
  :data="fontData"
  :range="fontRange"
  @input='setFontSize($event)'
  ref='slider'
)
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import AppSlider from '../Slider'

export default {
  name: 'FontSize',

  data () {
    return {
      fontVariations: 7,
      fontRange: [],
      fontData: []
    }
  },

  components: {
    AppSlider
  },

  methods: {
    ...mapMutations([
      'setFontSize'
    ])
  },

  computed: {
    ...mapGetters([
      'fontSize'
    ])
  },

  created () {
    let size = 57.5
    for (let index = 0; index < this.fontVariations; index++) {
      // Add data to the slider
      this.fontData.push(size)
      size += 2.5

      // Hise one label out of two
      this.fontRange.push({
        label: 'Aa',
        isHide: index % 2
      })
    }
  },

  mounted () {
    setTimeout(() => {
      // Todo: find out why position is offset when loading component in popup dynamicaly
      this.$refs.slider.refresh()
    }, 1000)
  }
}
</script>
