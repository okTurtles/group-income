<template>
  <button class="button is-outlined" @click="onClick">
    <slot></slot>
  </button>
</template>
<script>
const STATE_COUNTING = 'STATE_COUNTING'
const STATE_CANCELLED = 'STATE_CANCELLED'
const STATE_SUCCESS = 'STATE_SUCCESS'
const STATE_DONE = 'STATE_DONE'

export default {
  name: 'ButtonCountdown',
  props: {
    countdown: {
      default: 5,
      type: Number
    },
    onStateChange: Function // return (state, { opts })
  },
  data () {
    return {
      currentCountdown: this.countdown,
      intervalCountdown: null,
      timeoutCancel: null,
      isCounting: false,
      isCancelled: false
    }
  },
  methods: {
    onClick () {
      this.clearTimeoutCancel()
      this.isCounting ? this.cancelCountdown() : this.startCountdown()
      this.isCounting = !this.isCounting
    },
    startCountdown () {
      this.currentCountdown = this.countdown
      this.onStateChangeCounting()

      this.intervalCountdown = setInterval(() => {
        if (this.currentCountdown === 0) {
          this.clearCountdown()
          return this.onStateChange(STATE_SUCCESS)
        }

        this.currentCountdown -= 1

        this.onStateChangeCounting()
      }, 1000)
    },
    cancelCountdown () {
      this.clearCountdown()
      this.onStateChange(STATE_CANCELLED)

      this.timeoutCancel = setTimeout(() => {
        this.onStateChange(STATE_DONE)
      }, 3000)
    },
    clearCountdown () {
      clearInterval(this.intervalCountdown)
    },
    clearTimeoutCancel () {
      clearTimeout(this.timeoutCancel)
    },
    onStateChangeCounting () {
      this.onStateChange(STATE_COUNTING, {
        countdown: this.currentCountdown
      })
    }
  }
}
</script>
