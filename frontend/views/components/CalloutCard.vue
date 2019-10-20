<template lang='pug'>
  section.c-calloutCard(:class='{ card: isCard }')
    component.c-svg(:is='svg')
    div
      i18n.c-title(tag='h3') {{ title }}
      slot
</template>

<script>
export default {
  name: 'CalloutCard',
  props: {
    title: String,
    svg: Object, // Svg file as component
    isCard: Boolean
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-calloutCard {
  display: flex;

  p + button {
    margin-top: $spacer-lg;
  }
}

.c-svg {
  width: 4rem;
  height: 4rem;
  margin-right: $spacer;
  flex-shrink: 0;

  @include widescreen {
    width: 6.25rem;
    height: 6.25rem;
    margin-right: 2.5rem;
  }
}

.c-title {
  margin-bottom: $spacer-sm;
}
</style>
