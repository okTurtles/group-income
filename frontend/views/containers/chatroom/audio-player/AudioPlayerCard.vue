<template lang="pug">
.c-audio-player-card
  .c-card-upper-section
    button.is-unstyled.c-audio-play-button(
      type='button'
      :aria-label='L("Play")'
      @click.stop='playAudio'
    )
      i.icon-play

    .c-audio-metadata
      .c-file-name.has-ellipsis(:title='name') {{ name }}
      .c-file-size(v-if='size') {{ size }}

  audio-player.c-audio-player(
    ref='audioPlayer'
    :hideDefaultPlayButton='true'
    :src='src'
    :mimeType='mimeType'
  )
</template>

<script>
import AudioPlayer from '@components/AudioPlayer.vue'
export default {
  name: 'AudioPlayerCard',
  components: {
    AudioPlayer
  },
  props: {
    src: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    name: String,
    size: String
  },
  methods: {
    playAudio () {
      this.$refs.audioPlayer.play()
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

    i {
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
      color: $text_1;
      font-size: $size_small;
    }
  }
}

.is-dark-theme button.c-audio-play-button {
  background-color: $primary_2;
}
</style>
