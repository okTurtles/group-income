<template lang='pug'>
tr.c-row
  td.c-td-code
    span(v-if='code' v-safe-html='code')
    slot(v-else name='code')
  td.c-td-demo
    slot
</template>

<script>
export default {
  name: 'DSTableRow',
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

.c-td-code,
.c-td-demo {
  padding: 0.5rem 0;
  line-height: 1.25;
}

.c-td-code {
  font-size: $size-5;
  color: var(--styled-input-label-color);
}
</style>
