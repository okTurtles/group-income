<template lang="pug">
.code-fence-block.c-code-fence-wrapper
  .c-cta-container
    i18n.c-line-count(:args='{ lineCount }') {lineCount} lines
    button.is-extra-small.is-outlined.c-copy-button
      i.icon-copy
      i18n Copy

  .c-code-table
    table.code-fence-table
      colgroup
        col(width='3rem')
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

.c-cta-container {
  position: relative;
  display: none;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid $general_0;
  margin-bottom: 0.5rem;
}

.c-copy-button {
  i {
    margin-right: 0.25rem;
    transform: translateY(1px);
  }
}

.c-line-count {
  display: inline-block;
  font-size: $size_5;
  color: $text_1;
  padding-bottom: 0.125rem;
}
</style>
