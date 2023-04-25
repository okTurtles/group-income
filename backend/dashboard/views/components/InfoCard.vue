<template lang="pug">
.c-info-card
  i(:class='`icon-${icon} c-info-card-icon`')

  .c-info-card-content
    h4.c-info-card-heading.is-title-4(v-if='heading') {{ heading }}
    .c-info-card-body
      slot
</template>

<script>
export default {
  name: 'InfoCard',
  props: {
    heading: {
      type: String,
      required: false,
      default: ''
    },
    icon: {
      type: String,
      default: 'info'
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-info-card {
  display: flex;
  align-items: flex-start;
  width: 100%;
  padding: 1.25rem 1rem;
  border: 2px solid var(--info-card-feature-color);
  border-radius: 0.5rem;
  background-color: var(--info-card-bg-color);
}

.c-info-card-icon {
  display: inline-block;
  flex-shrink: 0;
  margin-right: 0.75rem;
  font-size: 2rem;
  line-height: 1.25;
  font-weight: 600;
  color: var(--info-card-feature-color);
}

.c-info-card-content {
  flex-grow: 1;
}

.c-info-card-heading {
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
  color: $text_0;
}

.c-info-card-body {
  color: $text_1;
  color: var(--info-card-content-color);
}
</style>
