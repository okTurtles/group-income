<template lang="pug">
.c-voice-recorder-container(
  ref='container'
  tabindex='0'
)
  .c-backdrop(@click.stop='highlightRecorder')
  .c-voice-recorder(
    :class='{ "is-highlighted": ephemeral.isHighlighted }'
  )
    button.is-unstyled.c-close-btn(@click.stop='close')
      i.icon-times
    .c-sound-patterns
      .c-pattern-bar(v-for='i in ephemeral.patternCount' :key='i')
    button.is-unstyled.c-record-btn(
      :class='{ "is-recording": ephemeral.isRecording }'
      @click.stop='recordOrStop'
    )
      i.icon-play(v-if='!ephemeral.isRecording')
      i.icon-check(v-else)
</template>

<script>
import { VOICE_RECORDING_MIME_TYPE } from '~/frontend/utils/constants.js'

export default {
  name: 'VoiceRecorder',
  data () {
    return {
      ephemeral: {
        patternCount: 30,
        isHighlighted: false,
        isRecording: false,
        audioChunks: [],
        audioStream: null,
        recorderInstance: null
      }
    }
  },
  methods: {
    close () {
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
        // 1. Get the live microphone stream and save it to the component state
        this.ephemeral.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })

        // 2. Create the MediaRecorder instance using the saved stream
        this.ephemeral.recorderInstance = new MediaRecorder(this.ephemeral.audioStream)

        // Capture data chunks as they become available
        this.ephemeral.recorderInstance.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.ephemeral.audioChunks.push(event.data)
          }
        }

        // When stopped, package the chunks into a playable audio file
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

        // Start recording.
        this.ephemeral.recorderInstance.start(1000)
        // TODO: implement visualising the sound pattern.
      } catch (err) {
        // TODO: error handling UI
        console.error('Error starting recording', err)
      }
    },
    stopRecording () {
      if (this.ephemeral.recorderInstance &&
        this.ephemeral.recorderInstance.state === 'recording'
      ) {
        this.ephemeral.recorderInstance.stop()
      }

      // 2. IMMEDIATELY turn off the hardware microphone (fixes the Mac toolbar light)
      if (this.ephemeral.audioStream) {
        this.ephemeral.audioStream.getTracks().forEach(track => {
          track.stop()
        })
        this.ephemeral.audioStream = null
      }
    }
  },
  mounted () {
    this.focusContainer()
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

$shadow-color: rgba(54, 54, 54, 0.3);
$shadow-color-dark: rgba(38, 38, 38, 0.895);

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
  box-shadow: $shadow-color;
  transition: box-shadow 150ms ease-in;

  &.is-highlighted {
    box-shadow: 0 0 0 2px $primary_1;
  }
}

.is-dark-theme .c-voice-recorder {
  box-shadow: $shadow-color-dark;
}

.c-close-btn,
.c-record-btn {
  position: relative;
  flex-shrink: 0;
  font-size: 0.75rem;
  width: 1.275rem;
  height: 1.275rem;
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

  i {
    transform: scale(0.75);
  }

  &:focus,
  &:focus-within,
  &:hover {
    background-color: $primary_0;
    color: $primary_2;
  }

  &.is-recording {
    background-color: $success_2;
    color: $success_0;
    font-size: 0.7rem;

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
  flex-direction: row-reverse;
  column-gap: 0.25rem;

  .c-pattern-bar {
    position: relative;
    display: block;
    height: 25%;
    width: 2px;
    background-color: $text_1;
    opacity: 0.675;
  }
}
</style>
