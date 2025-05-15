<template lang='pug'>
tr.c-row
  .c-combined-cell
    .c-code-row {{ code }}
    .c-demo-row
      slot

  td.c-td-code
    span(v-if='code') {{ code }}
    slot(v-else name='code')
  td.c-td-demo
    slot
</template>

<script>
export default {
  name: 'TableRow',
  props: {
    code: {
      type: String,
      required: false
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

@mixin from600 {
  @media screen and (min-width: 600px) {
    @content;
  }
}

@mixin code-style-common {
  font-size: $size_5;
  color: var(--styled-input-label-color);
  padding-right: 0.5rem;
}

.c-combined-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  row-gap: 0.75rem;
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid $border;
  width: 100%;

  .c-code-row {
    @include code-style-common;
  }

  .c-demo-row {
    position: relative;
    width: 100%;
  }

  @include from600 {
    display: none;
  }
}

.c-td-code,
.c-td-demo {
  display: none;
  padding: 0.75rem 0;
  line-height: 1.25;

  @include from600 {
    display: table-cell;
  }
}

.c-td-code {
  @include code-style-common;

  @include from ($tablet) {
    width: 360px;
  }
}
</style>
