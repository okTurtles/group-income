<template lang="pug">
.c-audio-player-card(:class='{ "for-send-area": forSendArea }')
  button.is-unstyled.c-audio-play-button(
    :class='{ "is-loading": ephemeral.isLoading }'
    type='button'
    :aria-label='L("Play")'
    @click.stop='togglePlay'
  )
    .simple-spinner.c-spinner(v-if='ephemeral.loadingStatus === "loading"')
    i.icon-pause(v-else-if='ephemeral.isPlaying')
    i.icon-play(v-else)

  .c-audio-metadata
    .c-file-name.has-ellipsis(v-if='attachment.name' :title='attachment.name') {{ attachment.name }}
    .c-file-size(v-if='size') {{ size }}

  audio-player.c-audio-player-controls(
    ref='audioPlayer'
    :key='src || "audio-player"'
    :hideDefaultPlayButton='true'
    :disabled='!src'
    :src='src'
    :mimeType='mimeType'
    :mode='forSendArea ? "minimal" : "default"'
    @playing='onPlaying'
    @pause='onPaused'
  )

  i18n.error.c-error(
    v-if='ephemeral.loadingStatus === "error" || true'
    tag='p'
  ) Failed to load audio. Please retry.
</template>

<script>
import AudioPlayer from '@components/AudioPlayer.vue'
import { CHATROOM_ATTACHMENT_TYPES } from '@model/contracts/shared/constants.js'

export default {
  name: 'AudioPlayerCard',
  components: {
    AudioPlayer
  },
  inject: ['attachmentUtils'],
  props: {
    src: {
      type: String,
      required: false
    },
    mimeType: {
      type: String,
      required: false
    },
    forSendArea: {
      type: Boolean,
      default: false
    },
    attachment: Object,
    size: String
  },
  data () {
    return {
      ephemeral: {
        loadingStatus: 'idle',
        isPlaying: false
      }
    }
  },
  methods: {
    togglePlay () {
      if (!this.src) {
        this.loadAudio()
      } else if (this.ephemeral.isPlaying) {
        this.$refs.audioPlayer.pause()
      } else {
        this.$refs.audioPlayer.play()
      }
    },
    onPlaying () {
      this.ephemeral.isPlaying = true
    },
    onPaused () {
      this.ephemeral.isPlaying = false
    },
    async loadAudio () {
      if (this.ephemeral.loadingStatus === 'loading') { return }

      try {
        this.ephemeral.loadingStatus = 'loading'

        await this.attachmentUtils.loadMediaObjectURL(this.attachment, CHATROOM_ATTACHMENT_TYPES.AUDIO)
        this.ephemeral.loadingStatus = 'idle'

        this.$nextTick(() => {
          // The component might be destroyed before loadMediaObjectURL() call is completed, so check if the player is still mounted.
          if (this.$refs.audioPlayer) {
            this.togglePlay()
          }
        })
      } catch (err) {
        console.error('AudioPlayerCard.vue caught:', err)
        this.ephemeral.loadingStatus = 'error'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-audio-player-card {
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto auto;
  grid-template-areas:
    "play-button metadata"
    "player player"
    "error error";
  column-gap: 0.75rem;
  padding-top: 0.25rem;
  align-items: center;

  button.c-audio-play-button {
    grid-area: play-button;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    margin-left: 0.25rem;
    min-height: 0;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0);
    background-color: $primary_1;
    color: $primary_0;

    &:focus,
    &:hover {
      border-color: currentColor;
    }

    &.is-loading {
      pointer-events: none;
    }

    i.icon-play {
      transform: translateX(1px);
    }
  }

  .c-audio-metadata {
    grid-area: metadata;
    position: relative;
    min-width: 0;
    padding-right: 0.25rem;

    .c-file-name {
      position: relative;
      font-weight: bold;
      max-width: 100%;
    }

    .c-file-size {
      display: flex;
      align-items: center;
      column-gap: 0.25rem;
      color: $text_1;
      font-size: $size_small;

      .c-file-ext {
        text-transform: uppercase;
        font-size: 0.675rem;
      }
    }
  }

  .c-audio-player-controls {
    grid-area: player;
  }

  .c-error {
    grid-area: error;
    font-size: $size_5;
    padding-left: 0.25rem;
    margin-top: 0.25rem;
  }

  &.for-send-area {
    // minimal layout/styles for audio attachments in send area
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: auto auto;
    grid-template-areas:
      "play-button metadata"
      "play-button player";
    column-gap: 0.5rem;
    padding-top: 0;
    align-items: center;
    background-color: $general_2;
    min-width: 0;
    max-width: 100%;

    button.c-audio-play-button {
      margin-left: 0;
      width: 2.25rem;
      height: 2.25rem;
    }

    .c-audio-metadata {
      max-width: 100%;
      padding-top: 0.25rem;
      line-height: 1.15;

      .c-file-name {
        font-size: 0.8rem;
        line-height: 1.125;
      }
    }

    .c-audio-player-controls {
      max-width: 100%;
      min-width: 0;

      ::v-deep .plyr--audio {
        min-width: 0;
      }
    }

    .c-error {
      // irrelevant in send area (any file attachment with a problem just won't be shown in the send area)
      display: none;
    }
  }
}

.c-spinner {
  position: relative;
  width: 1rem;
  height: 1rem;
  color: $primary_0;
}

// dark-theme style adjustments
.is-dark-theme button.c-audio-play-button {
  background-color: $primary_2;
}
</style>
