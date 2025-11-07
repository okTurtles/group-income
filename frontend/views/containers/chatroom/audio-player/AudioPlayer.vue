<template lang="pug">
.c-audio-player.plyr_override
  audio(ref='audioEl' controls playsinline)
    source(:src='src' :type='mimeType')
</template>

<script>
export default {
  name: 'AudioPlayer',
  props: {
    src: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
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
