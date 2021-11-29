<template lang='pug'>
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
import Slider from '@components/Slider.vue'

export default ({
  name: 'FontSize',

  data () {
    return {
      fontVariations: 4,
      fontRange: [],
      fontData: []
    }
  },

  components: {
    Slider
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

  watch: {
    fontSize () {
      this.$refs.slider.refresh()
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
}: Object)
</script>
