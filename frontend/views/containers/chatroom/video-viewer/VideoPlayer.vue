<template lang="pug">
.video-player-container.plyr_override
  video.c-video-el(
    ref='videoEl'
    playsinline
    controls
    @loadedmetadata='$emit("load")'
    @error='$emit("error")'
  )
    source(:src='src' :type='mimeType')
</template>

<script>
import Plyr from 'plyr'

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
    mode: {
      type: String,
      validator: v => ['default', 'simple'].includes(v),
      default: 'default'
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
      const controlsMap = {
        default: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
        simple: ['play', 'progress', 'mute', 'volume']
      }

      // plyr options reference: https://www.npmjs.com/package/plyr#options
      const opts = {
        debug: false,
        controls: controlsMap[this.mode],
        ...this.options
      }
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
