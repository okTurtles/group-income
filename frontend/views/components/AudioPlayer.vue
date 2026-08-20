<template lang="pug">
.c-audio-player.plyr_override.for-audio(:class='classObjs')
  audio(ref='audioEl' controls playsinline @loadedmetadata='onAudioSrcLoaded')
    source(:src='src' :type='mimeType')
</template>

<script>
import Plyr from 'plyr'
import { measureAudioDuration } from '@containers/chatroom/voice-recording/voice-recording-utils.js'

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
    }
  },
  data () {
    return {
      ephemeral: {
        player: null
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
    async onAudioSrcLoaded (e) {
      // Resolving a Firefox specific issue #3150 which is:
      // Firefox reports a duration of a few milliseconds for files it can't measure and it leads to
      // a wrong duration being displayed in the player UI.
      //
      // Anything under this value is treated as an wrong duration detected by browser rather than a genuinely tiny recording
      // And in that case we use AudioContext.decodeAudioData() API to compute the duration of the audio file.
      const MIN_BELIEVABLE_DURATION = 0.1
      const isFirefox = /\bFirefox\/\d/.test(navigator.userAgent)
      const audioEl = e.target

      if (!isFirefox || audioEl.duration >= MIN_BELIEVABLE_DURATION) { return }

      const measuredDuration = await measureAudioDuration(audioEl.currentSrc)
      // The player is gone if the component was destroyed while the file was being decoded.
      if (!measuredDuration || !this.ephemeral.player) { return }

      // Plyr reads config.duration on every access and prefers it over the element's own value,
      // and it refreshes what it displays on 'durationchange'.
      this.ephemeral.player.config.duration = measuredDuration
      audioEl.dispatchEvent(new Event('durationchange'))
    },
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

      // event listeners to relay to the parent component
      const relayedEvents = ['play', 'pause', 'playing', 'ended']
      relayedEvents.forEach(event => {
        this.ephemeral.player.on(event, () => this.$emit(event))
      })
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
