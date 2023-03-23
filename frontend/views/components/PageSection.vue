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
  },
  methods: {
    scrollToAnchor () {
      const anchorEl = this.$el.querySelector('.c-section-anchor')
      anchorEl && anchorEl.click()
    }
  },
  watch: {
    '$route': {
      immediate: true,
      handler (to, from) {
        if (to.hash &&
          (from?.hash !== to.hash) &&
          `#${this.anchor}` === to.hash) {
          setTimeout(this.scrollToAnchor, 100)
        }
      }
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
}
</style>
