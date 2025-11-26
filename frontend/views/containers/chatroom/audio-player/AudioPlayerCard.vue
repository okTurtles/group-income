<template lang="pug">
.c-audio-player-card
  .c-card-upper-section
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

  audio-player.c-audio-player(
    ref='audioPlayer'
    :key='src || "audio-player"'
    :hideDefaultPlayButton='true'
    :disabled='!src'
    :src='src'
    :mimeType='mimeType'
    @playing='onPlaying'
    @pause='onPaused'
  )

  i18n.error.c-error(
    v-if='ephemeral.loadingStatus === "error"'
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

  .c-card-upper-section {
    display: flex;
    align-items: center;
    column-gap: 0.75rem;
    padding: 0.25rem 1rem 0 0.25rem;
    margin-bottom: 0.25rem;
  }

  button.c-audio-play-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
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
    position: relative;
    flex-grow: 1;
    min-width: 0;

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
}

.is-dark-theme button.c-audio-play-button {
  background-color: $primary_2;
}

.c-spinner {
  position: relative;
  width: 1rem;
  height: 1rem;
  color: $primary_0;
}

.c-error {
  font-size: $size_5;
  padding-left: 0.25rem;
  margin-top: 0.25rem;
}
</style>
