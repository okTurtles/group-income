<template lang="pug">
.code-fence-block.c-code-fence-wrapper
  button.is-extra-small.is-outlined.c-copy-button(
    type='button'
    :aria-label='L("Copy code to clipboard")'
    @click.stop='copyToClipboard'
  )
    i.icon-check-circle(v-if='ephemeral.isCopied')
    i.icon-copy(v-else)

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
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-code-fence-wrapper {
  position: relative;
  display: block;
  width: 100%;
  padding: 0.5rem;
  border-radius: $radius-large;
  border: 1px solid $general_0;
}

.c-code-table {
  width: 100%;
}

.c-copy-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  min-height: 0;
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
  font-size: $size_4;
}

.c-line-count {
  display: inline-block;
  font-size: $size_5;
  color: $text_1;
  padding-bottom: 0.125rem;
}

.c-code-fence-wrapper:hover {
  .c-copy-button {
    opacity: 1;
  }
}
</style>
