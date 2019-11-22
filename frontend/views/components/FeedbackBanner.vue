<template lang='pug'>
  transition-expand
    .c-container(v-if='ephemeral.message')
      message(class='c-message' :severity='ephemeral.severity')
        .c-inner
          span(data-test='feedbackMessage') {{ ephemeral.message }}
          button.is-icon-small(
            type='button'
            :aria-label='L("Dismiss message")'
            @click='dismiss'
          )
            i.icon-times
</template>

<script>
import Message from '@components/Message.vue'
import TransitionExpand from '@components/TransitionExpand.vue'

export default {
  name: 'FeedbackBanner',
  components: {
    Message,
    TransitionExpand
  },
  data: () => ({
    ephemeral: {
      message: null,
      severity: null
    }
  }),
  methods: {
    dismiss () {
      this.ephemeral.message = ''
    },

    // To be used by parent. Example:
    // this.$refs.feedbackBanner.danger('ups!')
    danger (message) {
      this.ephemeral.message = message
      this.ephemeral.severity = 'danger'
    },
    warning (message) {
      this.ephemeral.message = message
      this.ephemeral.severity = 'warning'
    },
    success (message) {
      this.ephemeral.message = message
      this.ephemeral.severity = 'success'
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  display: flex; /* so margins don't collapse and transition is smooth */
  align-items: flex-start;
  overflow: hidden;
}

.c-message {
  width: 100%;
  margin-top: $spacer*1.5;
  overflow: hidden;
}

.c-inner {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
</style>
