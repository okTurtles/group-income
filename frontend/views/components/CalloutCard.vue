<template lang='pug'>
  section.c-calloutCard(:class='{ card: isCard }')
    component.c-svg(:is='svg')
    div
      h2.is-title-3.c-title(v-if='title') {{ title }}
      slot
</template>

<script>
export default ({
  name: 'CalloutCard',
  props: {
    title: String,
    svg: Object, // Svg file as component
    isCard: Boolean
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-calloutCard {
  display: flex;

  p + button {
    margin-top: 2rem;
  }
}

.c-svg {
  width: 4rem;
  height: 4rem;
  margin-right: 1rem;
  flex-shrink: 0;

  @include tablet {
    width: 6.25rem;
    height: auto;
    margin-right: 2.5rem;
  }
}

.c-title {
  margin-bottom: 0.5rem;
}
</style>
