<template lang='pug'>
  transition-expand
    .c-container(v-if='ephemeral.message')
      message(class='c-message' :severity='ephemeral.severity')
        .c-inner
          .c-inner-text(:data-test='dataTest') {{ ephemeral.message }}
          button.is-icon-small.c-button(
            type='button'
            :class='`is-${ephemeral.severity}`'
            :aria-label='L("Dismiss message")'
            @click='clean'
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
  props: {
    dataTest: {
      type: String,
      default: 'feedbackMsg'
    }
  },
  data: () => ({
    ephemeral: {
      message: null,
      severity: null
    }
  }),
  methods: {
    // To be used by parent. Example:
    // this.$refs.feedbackBanner.danger('ups!')
    clean () {
      this.ephemeral.message = ''
    },
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

  &-text {
    margin-top: 0.1rem; /* visually aligned */
  }
}

$severities:
  "info" $primary_0 $primary_1,
  "success" $success_0 $success_1,
  "warning" $warning_0 $warning_1,
  "danger" $danger_0 $danger_1;

.c-button {
  @each $class, $color, $hover in $severities {
    &.is-#{$class} {
      color: $color;

      &:hover,
      &:focus {
        background-color: $hover;
      }

      &:focus {
        box-shadow: 0 0 0 1px $color;
      }
    }
  }
}
</style>
