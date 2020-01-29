<template lang='pug'>
section.card
  .c-title-wrapper(v-if='$slots.cta')
    h2.is-title-3(v-if='title') {{ title }}
    slot(name='cta')
  h2.is-title-3(v-else-if='title') {{ title }}
  slot
</template>

<script>
export default {
  name: 'PageSection',
  props: {
    title: String
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-title-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
