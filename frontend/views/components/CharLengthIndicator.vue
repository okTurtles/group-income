<template lang="pug">
  span.c-char-len(:class='{ "is-error": isError }') {{ desc }}
</template>

<script>
export default {
  name: 'CharLengthIndicator',
  props: {
    max: {
      type: Number,
      required: true
    },
    currentLength: {
      type: Number,
      required: true
    },
    error: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    isError () {
      return this.error || this.currentLength > this.max
    },
    desc () {
      return `${this.currentLength}/${this.max}`
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-char-len {
  display: inline-block;
  line-height: $size_4;
  font-size: $size_5;
  color: $text_1;
  flex-shrink: 0;
  margin-bottom: 0.5rem;

  &.is-error {
    color: $danger_0;
  }
}
</style>
