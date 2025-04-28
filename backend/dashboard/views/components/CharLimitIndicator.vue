<template lang="pug">
  span.c-char-len(:class='{ "is-error": isError }') {{ desc }}
</template>

<script>
export default {
  name: 'CharLimitIndicator',
  props: {
    max: {
      type: Number,
      required: true
    },
    current: {
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
      return this.error || (this.current > this.max)
    },
    desc () {
      return `${this.current}/${this.max}`
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-char-len {
  display: inline-block;
  color: $text_1;
  font-size: $size_6;

  &.is-error {
    color: $danger;
  }
}
</style>
