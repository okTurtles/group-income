<template lang='pug'>
.c-toast-card(
  @animationend='onAnimationEnd'
  @mouseenter='pauseAnimation'
  @mouseleave='unpauseAnimation'
  :class='{ "no-enter-animation": data.entered, "is-leaving": ephemeral.isClosing }'
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

  .c-toast-progress-bar(v-if='hasDuration && ephemeral.progressBarStyles.width')
    .c-progress-bar-inner(
      ref='progressBarInner'
      :style='ephemeral.progressBarStyles'
      :class='{ "is-paused": ephemeral.animationState.paused }'
      @animationend='onAnimationEnd'
    )
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
        isClosing: false,
        durationTimeoutId: null,
        animationState: {
          paused: false,
          pausedPercentage: null
        },
        progressBarStyles: {
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
    hasDuration () {
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
        this.$emit('enter-animation-ended', this.data.id)
      }
      if (name.includes('toast-timeout-ani')) {
        this.closeToast()
      }
    },
    setupTimeout (percentage = 0) {
      if (this.hasDuration) {
        const aniDuration = percentage
          ? percentage * this.data.duration
          : this.data.duration - (Date.now() - this.data.createdTimestamp)

        // progressbar animation setup
        this.ephemeral.progressBarStyles = {
          width: `${percentage || Math.round(100 * aniDuration / this.data.duration)}%`,
          animationDuration: `${aniDuration}ms`
        }
      }
    },
    pauseAnimation () {
      if (this.hasDuration) {
        const animationObj = this.$refs.progressBarInner?.getAnimations()?.[0]
        if (animationObj) {
          const currProgress = animationObj.overallProgress
          this.ephemeral.animationState = {
            paused: true,
            pausedPercentage: Math.round(100 * currProgress)
          }
        }
      }
    },
    unpauseAnimation () {
      if (this.hasDuration && this.ephemeral.animationState.paused) {
        const percentageLeft = 100 - this.ephemeral.animationState.pausedPercentage
        const durationLeft = (percentageLeft / 100) * this.data.duration
        const adjustedCreatedTimestamp = Date.now() + this.data.duration - durationLeft

        this.ephemeral.animationState = {
          paused: false,
          pausedPercentage: null
        }

        this.$emit('unpause-animation', this.data.id, adjustedCreatedTimestamp)
      }
    }
  },
  created () {
    if (this.hasDuration) {
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
    animation-play-state: running;

    &.is-paused {
      animation-play-state: paused;
    }
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
