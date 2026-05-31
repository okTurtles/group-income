<template lang="pug">
.c-audio-player.plyr_override.for-audio(:class='classObjs')
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
      required: false
    },
    mimeType: {
      type: String,
      required: false
    },
    autoPlay: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String,
      validator: v => ['default', 'minimal'].includes(v), // 'minimal' mode is intended for use in send area
      default: 'default'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    hideDefaultPlayButton: {
      type: Boolean,
      default: false
    },
    notifyProgressUpdates: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      ephemeral: {
        player: null,
        progressAnimationId: null
      }
    }
  },
  computed: {
    classObjs () {
      return {
        'hide-default-play-button': this.hideDefaultPlayButton,
        'is-unplayable': this.disabled,
        'is-minimal': this.mode === 'minimal'
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

      this.ephemeral.player = new Plyr(
        this.$refs.audioEl,
        opts
      )

      // event listeners
      this.ephemeral.player.on('play', this.handleInstancePlay)
      this.ephemeral.player.on('pause', this.handleInstancePause)

      // events to merely relay to the parent component
      const relayingEvents = ['playing', 'ended']
      relayingEvents.forEach(event => {
        this.ephemeral.player.on(event, () => this.$emit(event))
      })
    },
    handleInstancePlay () {
      this.$emit('play')

      if (this.notifyProgressUpdates) {
        const currentTime = this.ephemeral.player.currentTime || 0
        const duration = this.ephemeral.player.duration

        if (duration > 0) {
          const progressPercent = (currentTime / duration)

          if (progressPercent <= 1) {
            this.$emit('progressUpdate', progressPercent)
            this.ephemeral.progressAnimationId = requestAnimationFrame(this.handleInstancePlay)
          }
        }
      }
    },
    handleInstancePause () {
      this.$emit('pause')

      if (this.notifyProgressUpdates && this.ephemeral.progressAnimationId) {
        cancelAnimationFrame(this.ephemeral.progressAnimationId)
        this.ephemeral.progressAnimationId = null
      }
    },
    play () {
      this.ephemeral.player.play()
    },
    pause () {
      this.ephemeral.player.pause()
    },
    togglePlay () {
      this.ephemeral.player.togglePlay()
    },
    reset () {
      this.ephemeral.player.stop()
    }
  },
  mounted () {
    this.initPlayer()
  },
  beforeDestroy () {
    if (this.ephemeral.player) {
      this.ephemeral.player.destroy()
    }
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
