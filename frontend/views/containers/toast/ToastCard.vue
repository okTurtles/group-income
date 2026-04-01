<template lang='pug'>
.c-toast-card
  .c-toast-content
    i.icon-check-circle.c-toast-icon
    .c-toast-message(v-safe-html:a='data.message')
    button.is-unstyled.c-toast-close(type='button' @click.stop='onClose')
      i.icon-close

  .c-toast-progress-bar
    .c-progress-bar-inner
</template>

<script>
export default {
  name: 'ToastCard',
  props: {
    data: Object
  },
  methods: {
    onClose () {
      console.log('TODO!')
      this.$emit('close')
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
}

.c-toast-content {
  position: relative;
  display: flex;
  align-items: flex-start;
  column-gap: 0.5rem;
  padding: 0.75rem;
}
</style>
