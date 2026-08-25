<template lang="pug">
.c-audio-player.plyr_override.for-audio(:class='classObjs')
  audio(ref='audioEl' controls playsinline @loadedmetadata='onAudioSrcLoaded' @error='onAudioError')
    source(:src='src' :type='mimeType' @error='onAudioError')
</template>

<script>
import Plyr from 'plyr'
import { measureAudioDuration } from '@containers/chatroom/voice-recording/voice-recording-utils.js'
import { isFirefox } from '@view-utils/filters.js'

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
        player: null,
        isMeasuringDuration: false
      }
    }
  },
  computed: {
    classObjs () {
      return {
        'hide-default-play-button': this.hideDefaultPlayButton,
        'is-unplayable': this.disabled || this.ephemeral.isMeasuringDuration,
        'is-minimal': this.mode === 'minimal'
      }
    }
  },
  methods: {
    async onAudioSrcLoaded (e) {
      // Resolving a Firefox specific issue #3150 which is:
      // Firefox reports a wrong duration (very small values such as 0.00067s) for audio files it can't measure and
      // it leads to a UI bug in the audio player.
      //
      // As a workaround, we choose a reasonably small threshold value and
      // treat anything below this value as an incorrect browser-reported duration.
      // Then we use AudioContext.decodeAudioData() API to compute the duration of the audio file.
      const MIN_BELIEVABLE_DURATION = 0.1
      const audioEl = e.target

      if (!isFirefox() || audioEl.duration >= MIN_BELIEVABLE_DURATION) {
        this.$emit('audio-metadata-loaded')
        return
      }

      this.ephemeral.isMeasuringDuration = true
      const measuredDuration = await measureAudioDuration(audioEl.currentSrc)
      this.ephemeral.isMeasuringDuration = false

      // measureAudioDuration() above is an async operation and the component can be destroyed while
      // it's still in progress. If that's the case, just return.
      if (!this.ephemeral.player) { return }

      // Plyr reads config.duration on every access and prefers it over the element's own value,
      // and it refreshes what it displays on 'durationchange' event.
      if (measuredDuration) {
        this.ephemeral.player.config.duration = measuredDuration
        audioEl.dispatchEvent(new Event('durationchange'))
      }

      this.$emit('audio-metadata-loaded')
    },
    onAudioError (e) {
      // AudioPlayer.vue can still be used in the UI when src prop isn't passed yet.
      // If the error is caused by this missing src, just ignore it.
      if (e.target?.tagName === 'SOURCE' && !this.src) { return }
      console.error('AudioPlayer.vue caught error:', e.target?.error || e)
      this.$emit('audio-load-failed', e)
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
      this.ephemeral.player = null
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
