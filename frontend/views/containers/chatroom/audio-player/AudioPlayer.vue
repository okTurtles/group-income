<template lang="pug">
.c-audio-player.plyr_override.for-audio
  audio(ref='audioEl' controls playsinline)
    source(:src='src' :type='mimeType')
</template>

<script>
import Plyr from 'plyr'

export default {
  name: 'AudioPlayer',
  props: {
    src: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    autoPlay: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      config: {
        player: null
      },
      ephemeral: {
        isReady: false
      }
    }
  },
  methods: {
    initPlayer () {
      const opts = {
        debug: false,
        autoplay: this.autoPlay
      }

      this.config.player = new Plyr(
        this.$refs.audioEl,
        opts
      )
      this.config.player.on('ready', () => {
        this.ephemeral.isReady = true
      })
    }
  },
  mounted () {
    this.initPlayer()
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-audio-player {
  position: relative;
  width: 100%;
  height: auto;
}
</style>
