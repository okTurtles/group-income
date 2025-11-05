<template lang='pug'>
section.card(:id='anchor')
  .c-title-wrapper(v-if='$slots.cta')
    h2.is-title-3(v-if='title' v-safe-html:a='titleHtml')
    slot(name='cta')
  h2.is-title-3(v-else-if='title' v-safe-html:a='titleHtml')
  slot
</template>

<script>
export default ({
  name: 'PageSection',
  props: {
    title: String,
    anchor: {
      type: String,
      default: ''
    }
  },
  computed: {
    titleHtml () {
      return this.anchor ? `<a class='c-section-anchor' href='#${this.anchor}'>${this.title}</a>` : this.title
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-title-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  row-gap: 1rem; // There should be a space between the title and the cta when they become two rows.
}
</style>
