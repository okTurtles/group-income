<template lang='pug'>
component.c-text-to-copy-container(
  :is='tag'
)
  span.c-text-content(@click='copyToClipBoard')
    slot(v-if='$slots.default')
    span(v-else) {{ text }}

  button.is-icon-small.c-copy-btn(@click='copyToClipBoard')
    i.icon-copy

  .tooltip.font-small.c-tooltip(:class='{ "is-active": isCopied }') {{ tooltipText }}
</template>

<script>
import L from '@common/translations.js'

export default {
  name: 'TextToCopy',
  props: {
    tag: {
      type: String,
      required: false,
      default: 'span'
    },
    text: {
      type: String,
      required: true,
      default: ''
    }
  },
  data () {
    return {
      isCopied: false
    }
  },
  computed: {
    tooltipText () {
      return this.isCopied ? L('Copied to clipboard') : this.text
    }
  },
  methods: {
    copyToClipBoard () {
      navigator.clipboard.writeText(this.text).then(() => {
        this.isCopied = true
        setTimeout(() => { this.isCopied = false }, 1200)
      })
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-text-to-copy-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: max-content;
  height: auto;
  min-width: 0;
  padding: 0.25rem 0.25rem 0.25rem 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid $border;
}

.c-text-content {
  display: inline-block;
  cursor: pointer;
  line-height: 1.2;

  &:hover {
    text-decoration: underline;
  }
}

.c-copy-btn {
  margin-left: 0.4rem;
  border-color: $text_1;
}

.c-tooltip {
  word-break: break-all;
}

.c-text-content:hover ~ .c-tooltip {
  opacity: 1;
}
</style>
