<template lang='pug'>
.c-toast-card(
  @animationend='onAnimationEnd'
  :class='{ "no-enter-animation": ephemeral.enterAnimationEnded, "is-leaving": ephemeral.isClosing }'
)
  .c-toast-content
    i.icon-check-circle.c-toast-icon
    .c-toast-message(v-safe-html:a='data.message')
    button.is-unstyled.c-toast-close(
      v-if='showCloseButton'
      type='button'
      @click.stop='closeToast'
    )
      i.icon-times-circle

  .c-toast-progress-bar(v-if='hasTimeout && ephemeral.progressBarInitStyles.width')
    .c-progress-bar-inner(:style='ephemeral.progressBarInitStyles')
</template>

<script>
export default {
  name: 'ToastCard',
  props: {
    data: Object
  },
  data () {
    return {
      ephemeral: {
        enterAnimationEnded: false,
        isClosing: false,
        timeoutId: null,
        progressBarInitStyles: {
          width: '',
          animationDuration: ''
        }
      }
    }
  },
  computed: {
    showCloseButton () {
      return !!this.data.closeable
    },
    hasTimeout () {
      return Number.isFinite(this.data.duration)
    }
  },
  methods: {
    closeToast () {
      this.ephemeral.isClosing = true
      setTimeout(() => {
        this.$emit('close', this.data.id)
      }, 300)
    },
    onAnimationEnd (e) {
      const name = e.animationName || ''
      if (name.includes('toast-card-enter')) {
        // This is to ensure enter-animation doesn't get triggered repeatedly on re-rendering.
        this.ephemeral.enterAnimationEnded = true
      }
    },
    setupTimeout () {
      const timeoutDuration = this.data.duration - (Date.now() - this.data.createdTimestamp)
      if (timeoutDuration > 0) {
        this.ephemeral.timeoutId = setTimeout(() => {
          this.closeToast()
        }, timeoutDuration)

        // config for progressbar animation
        this.ephemeral.progressBarInitStyles.width = `${Math.round(100 * timeoutDuration / this.data.duration)}%`
        this.ephemeral.progressBarInitStyles.animationDuration = `${timeoutDuration}ms`
      }
    }
  },
  created () {
    if (this.hasTimeout) {
      this.setupTimeout()
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
  pointer-events: auto;
  background-color: $background_0;

  &.no-enter-animation {
    opacity: 1;
    animation: none;
  }

  &.is-leaving {
    opacity: 1;
    animation: toast-card-leave 0.3s ease-in forwards;
    z-index: -1;
  }
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

.c-toast-progress-bar {
  position: relative;
  display: block;
  width: 100%;
  height: 2px;

  .c-progress-bar-inner {
    position: absolute;
    display: block;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background-color: $text_1;
    animation-name: toast-timeout-ani;
    animation-fill-mode: forwards;
    animation-timing-function: linear;
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

@keyframes toast-card-leave {
  0% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  100% {
    opacity: 0;
    transform: translate3d(0, 40%, 0);
  }
}

@keyframes toast-timeout-ani {
  to {
    width: 0;
  }
}
</style>
