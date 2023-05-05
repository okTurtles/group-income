<template lang="pug">
section.c-design-system-content
  .c-section-header
    h3.is-title-3 {{ title }}

  .c-section-content
    slot
</template>

<script>
export default {
  name: 'ContentOutlet.vue',
  props: {
    title: String,
    icon: {
      type: String,
      required: false,
      default: 'three-circle-plus'
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-section-header {
  position: relative;
  margin-bottom: 3.5rem;
}

.c-design-system-content {
  position: relative;

  ::v-deep .content-unit {
    .unit-name {
      text-decoration: underline;
    }

    .unit-description {
      font-size: 1.2rem;
    }
  }
}
</style>
