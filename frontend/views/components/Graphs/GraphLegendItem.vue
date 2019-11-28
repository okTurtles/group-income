<template lang='pug'>
li.c-container
  .c-inner
    span.has-text-1.c-desc {{ label }}
    span.is-title-4
      slot
      span.c-visual(:class='`has-background-${color}`')
  .c-description.help
    slot(name='description')
</template>

<script>
export default {
  name: 'GraphLegendItem',
  props: {
    label: {
      type: String,
      required: true
    },
    color: {
      type: String,
      required: true
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  padding: $spacer 0;

  &:not(:last-child) {
    border-bottom: 1px solid $general_0;
  }
}

.c-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.c-desc {
  display: block;
  margin-right: $spacer-sm;
}

.c-visual {
  display: inline-block;
  width: $spacer-sm;
  height: $spacer-sm;
  margin-left: $spacer-sm;
  margin-bottom: 0.06rem; // visually aligned
  border-radius: 1px;

  &.has-background-blank {
    outline: 1px solid $general_0;
  }
}
</style>
