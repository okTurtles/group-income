<template lang='pug'>
li
  .subtitle.c-label
    span.c-visual(v-if='color' :class='`has-background-${color}`')
    |       {{label}}

  span.is-size-5.has-text-weight-bold
    slot
</template>

<script>
export default {
  name: 'GraphLegendItem',
  props: {
    label: {
      type: String,
      required: true
    },
    color: String
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-label {
  line-height: 1;
}

.c-visual {
  display: inline-block;
  width: $spacer-sm;
  height: $spacer-sm;
  margin-right: $spacer-xs;
}
</style>
