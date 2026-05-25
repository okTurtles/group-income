<template lang="pug">
.c-voice-recorder
  button.is-unstyled.c-close-btn(@click='close')
    i.icon-times
  .c-sound-patterns
    .c-pattern-bar(v-for='i in ephemeral.patternCount' :key='i')
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
        patternCount: 30
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
  right: 0;
  top: -0.5rem;
  transform: translateY(-100%);
  display: flex;
  align-items: center;
  column-gap: 0.25rem;
  padding: 0.2rem 0.375rem;
  height: 1.875rem;
  border-radius: 1.5rem;
  background-color: $general_0;
}

.c-close-btn,
.c-record-btn {
  position: relative;
  flex-shrink: 0;
  font-size: $size_5;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background-color: $general_1;
  color: $text_1;
  transform: translateY(1px);
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
    height: 0.875rem;
    width: 2px;
    background-color: $primary_0;
  }
}
</style>
