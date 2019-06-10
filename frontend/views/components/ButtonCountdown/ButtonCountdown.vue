<template lang="pug">
  button.is-outlined(@click='onClick')
    slot
</template>

<script>
import countdownStates from './countdownStates'

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
          return this.onStateChange(countdownStates.SUCCESS)
        }

        this.currentCountdown -= 1

        this.onStateChangeCounting()
      }, 1000)
    },
    cancelCountdown () {
      this.clearCountdown()
      this.onStateChange(countdownStates.CANCELLED)

      this.timeoutCancel = setTimeout(() => {
        this.onStateChange(countdownStates.DONE)
      }, 3000)
    },
    clearCountdown () {
      clearInterval(this.intervalCountdown)
    },
    clearTimeoutCancel () {
      clearTimeout(this.timeoutCancel)
    },
    onStateChangeCounting () {
      this.onStateChange(countdownStates.COUNTING, {
        countdown: this.currentCountdown
      })
    }
  }
}
</script>
