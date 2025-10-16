<template lang="pug">
.video-player-container.plyr_override
  video.c-video-el(
    ref='videoEl'
    playsinline
    controls
    @loadedmetadata='onVideoSrcLoaded'
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
    },
    initialTime: {
      type: Number, // Floating point number in seconds
      required: false
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
      const optsPerMode = {
        default: {
          controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'settings', 'volume', 'fullscreen'],
          settings: ['speed']
        },
        simple: {
          controls: ['play', 'progress', 'mute', 'volume']
        }
      }

      // plyr options reference: https://www.npmjs.com/package/plyr#options
      const opts = {
        ...optsPerMode[this.mode],
        ...this.options
      }

      this.config.player = new Plyr(this.$refs.videoEl, opts)

      // event listeners
      const events = ['play', 'pause', 'ended', 'enterfullscreen', 'exitfullscreen']
      events.forEach(event => {
        this.config.player.on(event, () => this.$emit(event))
      })
    },
    onVideoSrcLoaded () {
      if (this.initialTime > 0) {
        this.config.player.currentTime = this.initialTime
      }

      this.$emit('load')
    },
    getCurrentTime () {
      return this.config.player.currentTime
    },
    pause () {
      this.config.player.pause()
    },
    play () {
      this.config.player.play()
    },
    togglePlay () {
      this.config.player.togglePlay()
    },
    isPlaying () {
      return this.config.player.playing
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
