<template lang="pug">
.c-audio-player.plyr_override.for-audio(
  :class='{ "hide-default-play-button": hideDefaultPlayButton }'
)
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
    },
    hideDefaultPlayButton: {
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
        controls: ['play', 'progress', 'current-time', 'mute', 'volume'],
        autoplay: this.autoPlay
      }

      this.config.player = new Plyr(
        this.$refs.audioEl,
        opts
      )

      // event listeners
      this.config.player.on('ready', () => {
        this.ephemeral.isReady = true
      })

      const events = ['play', 'pause', 'ended']
      events.forEach(event => {
        this.config.player.on(event, () => this.$emit(event))
      })
    },
    play () {
      this.config.player.play()
    },
    pause () {
      this.config.player.pause()
    },
    togglePlay () {
      this.config.player.togglePlay()
    },
    reset () {
      this.config.player.stop()
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
