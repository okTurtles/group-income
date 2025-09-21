<template lang="pug">
.video-player-container.plyr_override
  video.c-video-el(ref='videoEl' playsinline controls)
    source(:src='src' :type='mimeType')
</template>

<script>
import Plyr from 'plyr'

const defaultOptions = {
  // reference: https://www.npmjs.com/package/plyr#options
  debug: false
}

export default {
  name: 'VideoPlayer',
  props: {
    src: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    options: {
      type: Object,
      default: () => ({})
    }
  },
  data () {
    return {
      config: {
        player: null
      }
    }
  },
  methods: {
    initPlayer () {
      const opts = { ...defaultOptions, ...this.options }
      this.config.player = new Plyr(this.$refs.videoEl, opts)
    }
  },
  mounted () {
    this.initPlayer()
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-video-el {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: inherit;
}
</style>
