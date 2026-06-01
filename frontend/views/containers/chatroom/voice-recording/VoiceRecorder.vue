<template lang="pug">
.c-voice-recorder-container(
  ref='container'
  tabindex='0'
  v-on-clickaway='close'
)
  .c-backdrop(@click.stop='highlightRecorder')
  .c-voice-recorder(
    :class='{ "is-highlighted": ephemeral.isHighlighted }'
  )
    tooltip.c-btn-tooltip(
      direction='top'
      :text='L("Close")'
    )
      button.is-unstyled.c-close-btn(@click.stop='close')
        i.icon-times

    .c-sound-patterns
      .c-pattern-bar(v-for='(aveFrequency, index) in soundBarsToShow'
        :key='index'
        :class='{ "is-active": aveFrequency !== 0 }'
        :style='{ height: getBarHeight(aveFrequency) }'
      )

    tooltip.c-btn-tooltip(
      direction='top'
      :text='ephemeral.isRecording ? L("Stop") : L("Record")'
    )
      button.is-unstyled.c-record-btn(
        :class='{ "is-recording": ephemeral.isRecording }'
        @click.stop='recordOrStop'
      )
        i.icon-microphone(v-if='!ephemeral.isRecording')
        i.icon-check(v-else)
</template>

<script>
import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { VOICE_RECORDING_MIME_TYPE } from '~/frontend/utils/constants.js'
import { mixin as clickaway } from 'vue-clickaway'
import Tooltip from '@components/Tooltip.vue'

const MAX_SOUND_PATTERN_COUNT = 35
const getRepresentativeFrequency = (frequencyData) => {
  // Get some of the largest frequency values and compute the mean of them.
  const cloned = Array.from(frequencyData) // Unit8Array -> a normal array
  cloned.sort((a, b) => b - a)
  const largestSome = cloned.slice(0, 15)
  return largestSome.reduce((acc, curr) => acc + curr, 0) / largestSome.length
}

export default {
  name: 'VoiceRecorder',
  mixins: [clickaway],
  components: {
    Tooltip
  },
  data () {
    return {
      ephemeral: {
        soundBars: new Array(MAX_SOUND_PATTERN_COUNT).fill(0),
        isHighlighted: false,
        isRecording: false,
        audioChunks: [],
        audioStream: null,
        audioContext: null,
        audioAnalyser: null,
        recorderInstance: null,
        frequencyData: null,
        analyserTimeoutId: null
      }
    }
  },
  computed: {
    soundBarsToShow () {
      const len = this.ephemeral.soundBars.length
      const sliceIndex = Math.max(0, len - MAX_SOUND_PATTERN_COUNT)
      return this.ephemeral.soundBars.slice(sliceIndex)
    }
  },
  methods: {
    close () {
      if (this.ephemeral.isRecording) {
        this.stopRecording()
      }
      this.$emit('close')
    },
    recordOrStop () {
      if (!this.ephemeral.isRecording) {
        this.ephemeral.isRecording = true
        this.focusContainer() // To unfocus the play button
        this.startRecording()
      } else {
        this.stopRecording()
      }
    },
    highlightRecorder () {
      this.ephemeral.isHighlighted = true
      setTimeout(() => {
        this.ephemeral.isHighlighted = false
      }, 1000)
    },
    focusContainer () {
      this.$refs.container.focus()
    },
    async startRecording () {
      try {
        // Use MediaRecorder API to record the audio stream from the hardware microphone.
        // Reference: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder

        // Turn on or request permission to use the hardware microphone.
        this.ephemeral.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })

        // Create a MediaRecorder to start/stop recording and receive the audio data chunks.
        // Passing an explicit mimeType is required for the recorded file to correctly detect
        // audio duration in some Chromium-based browsers. (e.g. Chrome, Brave, both desktop/mobile)
        // Feature-detecting via MediaRecorder.isTypeSupported() and applying this option conditionally safely achieves it.
        const recorderOptions = MediaRecorder.isTypeSupported(VOICE_RECORDING_MIME_TYPE)
          ? { mimeType: VOICE_RECORDING_MIME_TYPE }
          : {}
        this.ephemeral.recorderInstance = new MediaRecorder(this.ephemeral.audioStream, recorderOptions)

        // Capture data chunks as they become available
        this.ephemeral.recorderInstance.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.ephemeral.audioChunks.push(event.data)

            if (this.ephemeral.frequencyData) {
              this.ephemeral.audioAnalyser.getByteFrequencyData(this.ephemeral.frequencyData)
            }
          }
        }

        // When stopped, turn the chunks into a playable audio file
        this.ephemeral.recorderInstance.onstop = () => {
          if (this.ephemeral.audioChunks.length > 0) {
            const audioBlob = new Blob(this.ephemeral.audioChunks, { type: VOICE_RECORDING_MIME_TYPE })
            const audioUrl = URL.createObjectURL(audioBlob)

            // Send this audioUrl to your chat UI or audio player element
            this.$emit('recording-completed', {
              url: audioUrl,
              type: audioBlob.type,
              size: audioBlob.size
            })
          } else {
            console.warn('No audio chunks were captured.')
          }
        }

        // --- Audio visualization logic ---
        // Reference: https://wesbos.com/javascript/15-final-round-of-exercise/85-audio-visualization#time-data-visualization
        this.ephemeral.audioContext = new AudioContext()

        // Create a source: source is sort of a node that pipe the audio stream to the audio context.
        const source = this.ephemeral.audioContext.createMediaStreamSource(this.ephemeral.audioStream)

        this.ephemeral.audioAnalyser = this.ephemeral.audioContext.createAnalyser()
        // fftSize: essentially specifies how much data should be collected.
        this.ephemeral.audioAnalyser.fftSize = 64

        source.connect(this.ephemeral.audioAnalyser)
        this.ephemeral.frequencyData = new Uint8Array(this.ephemeral.audioAnalyser.frequencyBinCount)

        // Start recording.
        this.ephemeral.recorderInstance.start(250)
        this.captureSoundPatterns()
      } catch (err) {
        console.error('[VoiceRecorder.vue] Error starting recording', err)
        this.stopRecording()
        sbp('gi.ui/toast', 'chat-main', {
          message: L('Failed to start recording. Please try again.'),
          duration: 5000,
          closeable: true,
          variant: 'error',
          position: 'bottom-center'
        })
      }
    },
    stopRecording () {
      if (this.ephemeral.recorderInstance &&
        this.ephemeral.recorderInstance.state === 'recording'
      ) {
        this.ephemeral.recorderInstance.stop()
      }

      // Turn off the hardware microphone
      if (this.ephemeral.audioStream) {
        this.ephemeral.audioStream.getTracks().forEach(track => {
          track.stop()
        })
        this.ephemeral.audioStream = null
      }

      this.$nextTick(() => {
        this.stopCapturingSoundPattern()
        this.ephemeral.frequencyData = null
      })
    },
    captureSoundPatterns () {
      this.ephemeral.audioAnalyser.getByteFrequencyData(this.ephemeral.frequencyData)
      // get the representative frequency value of the sound stream
      const representativeFrequency = getRepresentativeFrequency(this.ephemeral.frequencyData)
      this.ephemeral.soundBars.push(representativeFrequency / 255 * 100)

      this.ephemeral.analyserTimeoutId = setTimeout(() => {
        this.captureSoundPatterns()
      }, 100)
    },
    stopCapturingSoundPattern () {
      clearTimeout(this.ephemeral.analyserTimeoutId)
      this.ephemeral.analyserTimeoutId = null
      this.ephemeral.soundBars = new Array(MAX_SOUND_PATTERN_COUNT).fill(0)
    },
    cleanupAudioRecording () {
      if (this.ephemeral.isRecording) {
        this.stopRecording()
      }

      if (this.ephemeral.recorderInstance) {
        this.ephemeral.recorderInstance.ondataavailable = null
        this.ephemeral.recorderInstance.onstop = null
        this.ephemeral.recorderInstance = null
      }

      this.ephemeral.audioContext = null
      this.ephemeral.audioAnalyser = null
      this.ephemeral.audioStream = null

      this.ephemeral.audioChunks = []
      this.ephemeral.soundBars = []
      this.ephemeral.soundBarsFinal = []
    },
    getBarHeight (aveFreqPercentage) {
      if (aveFreqPercentage < 5) {
        // minimum height here is required to prevent 0 height bars in the visualizer UI.
        aveFreqPercentage = 5
      }

      return `${aveFreqPercentage}%`
    }
  },
  mounted () {
    this.focusContainer()
  },
  beforeDestroy () {
    this.cleanupAudioRecording()
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

$shadow-color: rgba(219, 219, 219, 0.6);
$shadow-color-dark: rgba(38, 38, 38, 0.425);

@mixin applyShadow($color) {
  box-shadow: 0 0 20px $color;

  &.is-highlighted {
    box-shadow:
      0 0 20px $color,
      0 0 0 2px $primary_1;
  }
}

.c-voice-recorder-container {
  position: absolute;
  display: block;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 5;

  .c-backdrop {
    position: absolute;
    display: block;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: 0;
    background: $general_1;
    opacity: 0.275;
  }
}

.c-voice-recorder {
  position: absolute;
  right: 0;
  top: -0.5rem;
  transform: translateY(-100%);
  display: flex;
  column-gap: 0.5rem;
  padding: 0.2rem 0.25rem;
  border-radius: 1.5rem;
  border: 1px solid $general_1;
  background-color: $general_2;
  @include applyShadow($shadow-color);
}

.is-dark-theme .c-voice-recorder {
  @include applyShadow($shadow-color-dark);
}

.c-btn-tooltip {
  line-height: 1;
}

.c-close-btn,
.c-record-btn {
  position: relative;
  flex-shrink: 0;
  font-size: 0.8rem;
  width: 1.425rem;
  height: 1.425rem;
  border-radius: 50%;
  transform: translateY(1px);
}

.c-close-btn {
  background-color: $text_1;
  color: $general_1;

  &:focus,
  &:focus-within,
  &:hover {
    background-color: $text_0;
  }
}

.c-record-btn {
  background-color: $primary_2;
  color: $primary_0;

  &:focus,
  &:focus-within,
  &:hover {
    background-color: $primary_0;
    color: $primary_2;
  }

  &.is-recording {
    background-color: $success_2;
    color: $success_0;
    font-size: 0.75rem;

    i {
      transform: scale(1);
    }

    &:focus,
    &:focus-within,
    &:hover {
      background-color: $success_0;
      color: $success_2;
    }
  }
}

.c-sound-patterns {
  position: relative;
  display: flex;
  flex-grow: 1;
  align-items: center;
  flex-direction: row;
  column-gap: 0.2rem;

  .c-pattern-bar {
    position: relative;
    display: block;
    height: 1px; // will be overriden by the inline styles.
    width: 2px;
    background-color: $text_1;
    opacity: 0.675;

    &.is-active {
      background-color: $text_0;
      opacity: 1;
    }
  }
}
</style>
