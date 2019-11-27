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
      v-if='ephemeral.isTooltipActive'
      key='test'
      tag='p'
    ) Copied to clipboard!
</template>

<script>
export default {
  name: 'CopyToClipboard',
  data () {
    return {
      ephemeral: {
        isTooltipActive: false
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
        navigator.share({
          title: this.L('Your invite'),
          url: this.textToCopy
        })
        return
      }

      this.$refs.input.select()
      document.execCommand('copy')
      this.ephemeral.isTooltipActive = true
      setTimeout(() => {
        this.ephemeral.isTooltipActive = false
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
}

.c-tooltip {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, calc(-100% - #{$size_3}));
  min-width: 3rem;
  width: max-content;
  border-radius: $radius;
  padding: $spacer-sm;
  z-index: $zindex-tooltip;
  pointer-events: none;
  background-color: $text_0;
  color: #fff;

  &:not(.fade-enter-active):not(.fade-leave-active) {
    opacity: 0.95;
  }
}

</style>
