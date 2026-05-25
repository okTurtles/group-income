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

$shadow-color: rgba(54, 54, 54, 0.3);
$shadow-color-dark: rgba(38, 38, 38, 0.895);

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
  background-color: $success_2;
  color: $success_0;
  font-size: 0.7rem;

  &:focus,
  &:focus-within,
  &:hover {
    background-color: $success_0;
    color: $success_2;
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
    opacity: 0.625;
  }
}
</style>
