<template lang='pug'>
.c-toast-card(
  @animationend='onAnimationEnd'
  @mouseenter='pauseAnimation'
  @mouseleave='unpauseAnimation'
  :class='["is-type-" + data.variant, { "no-enter-animation": data.entered, "is-leaving": ephemeral.isClosing }]'
)
  .c-toast-wrapper
    .c-toast-icon-container
      i(:class='["icon-" + iconName, "c-toast-icon"]')

    .c-toast-content
      .c-toast-title(v-if='data.title') {{ data.title }}
      .c-toast-message(v-safe-html:a='data.message')

    button.is-unstyled.c-toast-close(
      v-if='showCloseButton'
      type='button'
      @click.stop='closeToast'
    )
      i.icon-times

  .c-toast-progress-bar(v-if='hasDuration && ephemeral.progressBarStyles.width')
    .c-progress-bar-inner(
      ref='progressBarInner'
      :style='ephemeral.progressBarStyles'
      :class='{ "is-paused": ephemeral.animationState.paused }'
      @animationend.stop='onAnimationEnd'
    )
</template>

<script>
import { TOAST_VARIANTS } from '@utils/constants.js'

export default {
  name: 'ToastCard',
  props: {
    data: {
      // type ToastData from '@utils/ui.js'
      type: Object,
      required: true
    }
  },
  data () {
    return {
      ephemeral: {
        isClosing: false,
        closeTimer: null,
        animationState: {
          paused: false,
          progressOnPause: null
        },
        progressBarStyles: {
          width: '',
          animationDuration: ''
        }
      }
    }
  },
  computed: {
    iconName () {
      return this.data.icon || ({
        [TOAST_VARIANTS.DEFAULT]: 'info',
        [TOAST_VARIANTS.SUCCESS]: 'check',
        [TOAST_VARIANTS.WARNING]: 'exclamation',
        [TOAST_VARIANTS.ERROR]: 'exclamation-triangle'
      })[this.data.variant || TOAST_VARIANTS.DEFAULT]
    },
    showCloseButton () {
      return !!this.data.closeable
    },
    hasDuration () {
      return typeof this.data.duration === 'number' && this.data.duration > 0
    }
  },
  methods: {
    closeToast () {
      if (this.ephemeral.isClosing) { return }

      this.ephemeral.isClosing = true
      this.ephemeral.closeTimer = setTimeout(() => {
        this.$emit('close', this.data.id)
      }, 300)
    },
    onAnimationEnd (e) {
      const name = e.animationName || ''
      if (name.includes('toast-card-enter')) {
        // This is to ensure enter-animation doesn't get triggered repeatedly on re-rendering.
        this.$emit('enter-animation-ended', this.data.id)
      } else if (name.includes('toast-timeout-ani')) {
        this.closeToast()
      }
    },
    setupTimeout () {
      if (this.hasDuration) {
        let aniDuration = this.data.duration - (Date.now() - this.data.createdTimestamp)

        if (aniDuration < 0) {
          // For any rare case where (createdTimestamp + duration) surpasses the Data.now(),
          // set the animation to the full duration value to prevent toast card from persisting indefinitely.
          aniDuration = this.data.duration
        }

        // progressbar animation setup
        this.ephemeral.progressBarStyles = {
          width: `${Math.round(100 * aniDuration / this.data.duration)}%`,
          animationDuration: `${aniDuration}ms`
        }
      }
    },
    pauseAnimation () {
      if (this.hasDuration && this.$refs.progressBarInner) {
        const getComputedWidth = el => parseFloat(window.getComputedStyle(el).width)
        const progressBarWidth = getComputedWidth(this.$refs.progressBarInner)
        const containerWidth = getComputedWidth(this.$refs.progressBarInner.parentElement)
        const wRatioOnPause = progressBarWidth / containerWidth

        if (!Number.isNaN(wRatioOnPause) && wRatioOnPause > 0 && wRatioOnPause < 1) {
          this.ephemeral.animationState = {
            paused: true, progressOnPause: 1 - wRatioOnPause
          }
        }
      }
    },
    unpauseAnimation () {
      if (this.hasDuration && this.ephemeral.animationState.paused) {
        // On resuming the progress animation of the toast card, update the createdTimestamp of the toast item to:
        // Now - (The time spent up until the point of pause)
        // This is important to prevent a bug where the progress bar animation starts from 100% again when toast card is re-rendered.
        const adjustedCreatedTimestamp = Date.now() - this.data.duration * this.ephemeral.animationState.progressOnPause

        this.ephemeral.animationState = {
          paused: false,
          progressOnPause: null
        }

        this.$emit('unpause-animation', this.data.id, adjustedCreatedTimestamp)
      }
    }
  },
  created () {
    if (this.hasDuration) {
      this.setupTimeout()
    }
  },
  beforeDestroy () {
    if (this.ephemeral.closeTimer) {
      clearTimeout(this.ephemeral.closeTimer)
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

@mixin toast-style-definitions {
  // default
  --toast-border-color: #{$general_0};
  --toast-background-color: #{$general_2};
  --toast-close-button-color: #{$text_1};
  --toast-icon-color: #{$general_2};
  --toast-icon-bg-color: #{$text_1};
  --toast-progress-bar-color: #{$text_1};
  --toast-title-color: #{$text_0};
  --toast-message-color: #{$text_1};

  &.is-type-success {
    --toast-border-color: rgba(0, 0, 0, 0);
    --toast-background-color: #{$success_2};
    --toast-icon-color: #{$general_2};
    --toast-icon-bg-color: #{$success_0_1};
    --toast-message-color: #{$success_0_1};
    --toast-close-button-color: #{$success_0_1};
    --toast-progress-bar-color: #{$success_0_1};
  }

  &.is-type-warning {
    --toast-border-color: rgba(0, 0, 0, 0);
    --toast-background-color: #{$warning_2};
    --toast-icon-color: #{$warning_2};
    --toast-icon-bg-color: #{$warning_0_1};
    --toast-title-color: #{$text_0};
    --toast-message-color: #{$warning_0_1};
    --toast-close-button-color: #{$warning_0_1};
    --toast-progress-bar-color: #{$warning_0_1};
  }

  &.is-type-error {
    --toast-border-color: rgba(0, 0, 0, 0);
    --toast-background-color: #{$danger_2};
    --toast-icon-color: #{$danger_2};
    --toast-icon-bg-color: #{$danger_0_1};
    --toast-message-color: #{$danger_0_1};
    --toast-close-button-color: #{$danger_0_1};
    --toast-progress-bar-color: #{$danger_0_1};
  }
}

$shadow-color: rgba(54, 54, 54, 0.3);
$shadow-color-dark: rgba(38, 38, 38, 0.895);

.c-toast-card {
  @include toast-style-definitions;
  position: relative;
  display: block;
  width: 100%;
  border-radius: $radius-large;
  border: 1px solid var(--toast-border-color);
  overflow: hidden;
  opacity: 0;
  animation: toast-card-enter 0.3s ease-out forwards;
  pointer-events: auto;
  background-color: var(--toast-background-color);
  box-shadow: 0 0.75rem 1.25rem $shadow-color;

  &.no-enter-animation {
    opacity: 1;
    animation: none;
  }

  &.is-leaving {
    opacity: 1;
    animation-duration: 0.3s;
    animation-timing-function: ease-in;
    animation-fill-mode: forwards;
    animation-name: toast-card-leave-down;
    z-index: -1;
  }
}

.toast-inner-pocket {
  &.is-bottom-left,
  &.is-bottom-center,
  &.is-bottom-right {
    .c-toast-card.is-leaving {
      animation-name: toast-card-leave-up;
    }
  }
}

.c-toast-wrapper {
  position: relative;
  display: flex;
  align-items: flex-start;
  column-gap: 0.625rem;
  padding: 0.75rem;
  word-break: break-word;

  .c-toast-icon-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: $radius-large;
    background-color: var(--toast-icon-bg-color);
    margin-top: 1px;
    flex-shrink: 0;
    opacity: 0.75;

    &::after {
      content: "";
      position: absolute;
      display: block;
      top: 40%;
      left: 40%;
      width: 80%;
      height: 80%;
      transform: translate(-50%, -50%);
      background-color: var(--toast-icon-bg-color);
      filter: blur(12px);
      border-radius: inherit;
      z-index: -1;
    }
  }

  .c-toast-icon {
    display: inline-block;
    font-size: 0.675rem;
    line-height: 1;
    color: var(--toast-icon-color);
  }

  .c-toast-content {
    flex-grow: 1;
  }

  .c-toast-title {
    font-weight: 700;
    color: var(--toast-title-color);

    + .c-toast-message {
      padding-top: 0;
    }
  }

  .c-toast-message {
    color: var(--toast-message-color);
    padding-top: 1px;

    ::v-deep .link {
      color: var(--toast-message-color);
    }
  }

  .c-toast-close {
    color: var(--toast-close-button-color);
    flex-shrink: 0;
    font-size: 1.125em;
    font-weight: 500;
    line-height: 1;
    opacity: 0.625;
    transform: translateY(3px);
    transition:
      opacity 0.15s ease-out,
      color 0.15s ease-out;

    &:hover,
    &:focus,
    &:focus-within {
      opacity: 1;
    }
  }
}

.c-toast-progress-bar {
  position: relative;
  display: block;
  width: 100%;
  height: 1px;

  .c-progress-bar-inner {
    position: absolute;
    display: block;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background-color: var(--toast-progress-bar-color);
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

// dark-theme specific adjustments
.is-dark-theme {
  .c-toast-card {
    box-shadow: 0 0.5rem 1rem $shadow-color-dark;
  }

  .c-toast-icon-container::after {
    background-color: rgb(38, 38, 38);
  }
}

@keyframes toast-card-leave-up {
  0% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  100% {
    opacity: 0;
    transform: translate3d(0, -40%, 0);
  }
}

@keyframes toast-card-leave-down {
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
