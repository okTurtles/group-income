<template lang="pug">
.c-voice-recorder
  button.is-unstyled.c-close-btn(@click='close')
    i.icon-times
  .c-sound-patterns
    .c-pattern-box(v-for='i in ephemeral.patternCount' :key='i')
  button.is-unstyled.c-record-btn(@click='record')
    i.icon-check
</template>

<script>
export default {
  name: 'VoiceRecorder',
  data () {
    return {
      ephemeral: {
        isOpen: false,
        patternCount: 20
      }
    }
  },
  methods: {
    close () {
      console.log('TODO: close voice recorder UI')
    },
    record () {
      console.log('TODO: record voice')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-voice-recorder {
  position: absolute;
}
</style>
