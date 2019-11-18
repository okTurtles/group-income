<template lang='pug'>
  message.c-container(v-if='message' :severity='severity')
    .c-inner
      span {{ message }}
      button.is-icon-small(
        :aria-label='L("Dismiss banner")'
        @click='dismiss'
      )
        i.icon-times
</template>

<script>
import Message from '@components/message'

export default {
  name: 'FeedbackBanner',
  components: {
    Message
  },
  props: {
    message: String,
    severity: {
      type: String,
      default: 'danger',
      validator: (v) => ['info', 'warning', 'danger'].includes(v)
    }
  },
  methods: {
    dismiss () {
      this.$emit('update:message', '')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  margin: 1.5rem 0;
}

.c-inner {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
</style>
