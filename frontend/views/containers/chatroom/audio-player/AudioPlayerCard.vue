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
      .c-file-name.has-ellipsis(:title='metadata.name') {{ metadata.name }}
      .c-file-size(v-if='metadata.size') {{ metadata.size }}

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
    metadata: {
      type: Object,
      required: true
    }
  }
}
</script>