<template lang="pug">
.code-fence-block.c-code-fence-wrapper
  .c-cta-container
    span.c-line-count {{ nLinesText }}
    button.is-extra-small.is-outlined.c-copy-button(
      type='button'
      :aria-label='L("Copy code to clipboard")'
      :class='{ "is-copied": ephemeral.isCopied }'
      @click.stop='copyToClipboard'
    )
      template(v-if='ephemeral.isCopied')
        i.icon-check-circle
        i18n.c-copied-text Copied!
      template(v-else)
        i.icon-copy
        i18n.c-copied-text Copy

  .c-code-table
    table.code-fence-table
      colgroup
        col(width='2rem')
        col(width='100%')
      tbody
        tr(v-for='codeLine in codeLines')
          td.line-number {{ codeLine.lineNumber }}
          td.code-line {{ codeLine.text }}
</template>

<script>
import { L } from '@common/common.js'

export default {
  name: 'CodeFence',
  props: {
    content: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      ephemeral: {
        isCopied: false
      }
    }
  },
  computed: {
    codeLines () {
      return this.content.split('\n').map((line, index) => ({
        text: line,
        lineNumber: index + 1
      }))
    },
    nLinesText () {
      return this.lineCount === 1
        ? L('{n} line', { n: this.lineCount })
        : L('{n} lines', { n: this.lineCount })
    },
    lineCount () {
      return this.codeLines.length
    }
  },
  methods: {
    copyToClipboard () {
      navigator.clipboard.writeText(this.content).then(() => {
        this.ephemeral.isCopied = true
        setTimeout(() => {
          this.ephemeral.isCopied = false
        }, 1500)
      })
    }
  },
  mounted () {
    console.log('!@# mounted', this.content)
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-code-fence-wrapper {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border-radius: $radius-large;
  border: 1px solid $general_0;
}

.c-code-table {
  width: 100%;
  padding: 0 0.5rem;
}

.c-cta-container {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  column-gap: 0.5rem;
  width: 100%;
  border-bottom: 1px solid $general_0;
  padding: 0.5rem;

  .c-line-count {
    font-size: $size_5;
    color: $text_1;
    padding-bottom: 1px;
  }
}

button.c-copy-button {
  min-height: 0;

  &:focus,
  &:active,
  &:hover {
    background-color: $background;
    border-color: $text_1;
    color: $text_0;
  }

  &:focus {
    box-shadow: 0 0 0 1px $general_0;
  }

  &.is-copied {
    color: $success_0;
    border-color: $success_0;
  }

  i {
    margin-right: 0.25rem;
  }
}

.c-line-count {
  display: inline-block;
  font-size: $size_5;
  color: $text_1;
  padding-bottom: 0.125rem;
}
</style>
