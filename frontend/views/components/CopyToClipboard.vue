<template lang='pug'>
.c-wrapper(@click='copyToClipboard')
  input.c-invisible-input(
    type='text'
    ref='input'
    :value='textToCopy'
  )
  slot
  transition(name='fade')
    i18n.c-tooltip(
      tag='p'
      v-if='ephemeral.tooltipActive'
    ) Copied to clipboard!
</template>

<script>
import { activateWebShare } from '../utils/webShare.js'

export default {
  name: 'copyToClipboard',
  data () {
    return {
      ephemeral: {
        tooltipActive: false
      }
    }
  },
  props: {
    textToCopy: {
      type: String,
      required: true
    }
  },
  methods: {
    copyToClipboard () {
      // if the user is using the device that supports web share API, use it and then skip the other logics below.
      if (navigator.share) {
        activateWebShare({
          title: this.L('Your invite'),
          url: this.textToCopy
        })
        return
      }

      this.$refs.input.select()
      document.execCommand('copy')
      this.ephemeral.tooltipActive = true
      setTimeout(() => {
        this.ephemeral.tooltipActive = false
      }, 1500)
    }
  }
}
</script>

<style lang='scss' scoped>
@import '../../assets/style/_variables.scss';

.c-wrapper {
  position: relative;

  .c-invisible-input {
    position: absolute;
    pointer-events: none;
    opacity: 0;
    z-index: -100;
  }

  .c-tooltip {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, calc(-100% - #{$size-3}));
    min-width: 3rem;
    width: max-content;
    border-radius: $radius;
    padding: $spacer-sm;
    opacity: 0.95;
    z-index: $zindex-tooltip;
    pointer-events: none;
    background-color: $text_0;
    color: #fff;
  }
}

/*
.fade-enter-active {
  animation: fadein 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
}
.fade-leave-active {
  animation: fadeout 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
}

@keyframes fadein {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
@keyframes fadeout {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}
*/
</style>
