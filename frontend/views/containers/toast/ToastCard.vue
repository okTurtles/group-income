<template lang='pug'>
.c-toast-card
  .c-toast-content
    i.icon-check-circle.c-toast-icon
    .c-toast-message(v-safe-html:a='data.message')
    button.is-unstyled.c-toast-close(
      v-if='showCloseButton'
      type='button'
      @click.stop='onClose'
    )
      i.icon-times-circle

  .c-toast-progress-bar
    .c-progress-bar-inner
</template>

<script>
export default {
  name: 'ToastCard',
  props: {
    data: Object
  },
  computed: {
    showCloseButton () {
      return !!this.data.closeable
    }
  },
  methods: {
    onClose () {
      this.$emit('close', this.data.id)
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-toast-card {
  position: relative;
  display: block;
  width: 100%;
  border-radius: $radius;
  border: 1px solid $text_1;
  overflow: hidden;
  opacity: 0;
  animation: toast-card-enter 0.3s ease-out forwards;
}

.c-toast-content {
  position: relative;
  display: flex;
  align-items: flex-start;
  column-gap: 0.5rem;
  padding: 0.75rem;
  word-break: break-word;

  .c-toast-icon {
    display: inline-block;
    flex-shrink: 0;
  }

  .c-toast-message {
    flex-grow: 1;
  }

  .c-toast-close {
    color: $text_1;
    flex-shrink: 0;
    font-size: 1.15em;
  }
}

@keyframes toast-card-enter {
  from {
    opacity: 0;
    transform: translate3d(0, 50%, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
</style>
