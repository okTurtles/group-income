<template lang='pug'>
component.c-text-to-copy-container(
  :is='tag'
)
  slot
    span.c-text-content {{ textToCopy }}

  button.is-icon-small.c-copy-btn
    i.icon-copy
</template>

<script>
export default {
  name: 'LTextToCopy',
  props: {
    tag: {
      type: String,
      required: false,
      default: 'span'
    },
    textToCopy: {
      type: String,
      required: true,
      default: ''
    }
  },
  data () {
    return {
      isMobile: false
    }
  },
  methods: {
    copyToClipBoard () {
      if (navigator.share && this.isMobile) {
        console.log('TODO! copy to clipboard!')
      }
    }
  },
  created () {
    // https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser#comment95674193_51774045
    this.isMobile = !window.matchMedia('(any-pointer:fine)').matches
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-text-to-copy-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: max-content;
  height: auto;
  min-width: 0;
  padding: 0.25rem;
  border-radius: 0.5rem;
  border: 1px solid $border;
}

.c-text-content {
  display: inline-block;
  cursor: pointer;
  line-height: 1.2;

  &:hover {
    text-decoration: underline;
  }
}

.c-copy-btn {
  margin-left: 0.4rem;
  border-color: $text_1;
}
</style>
