<template lang="pug">
section.c-design-system-content
  .c-section-header
    h3.is-title-3.c-title
      i.icon-info.c-title-icon
      span {{ title }}

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
  margin-bottom: 2.75rem;
}

.c-design-system-content {
  position: relative;

  ::v-deep .content-unit {
    position: relative;
    margin-bottom: 4rem;

    .unit-name {
      position: relative;
      display: inline-flex;
      align-items: center;
      column-gap: 0.75rem;
      font-size: 1rem;
      font-weight: bold;
      line-height: 1.275;
      letter-spacing: 1px;
      color: $text-0;
      padding-bottom: 1rem;
      margin-bottom: 2.5rem;

      &:has(+ .unit-description) {
        margin-bottom: 1rem;
      }

      &::after {
        position: absolute;
        content: "";
        display: block;
        height: 1px;
        width: 2.75rem;
        border-bottom: 1px solid $text-0;
        left: 0;
        bottom: 0;
        opacity: 0.75;
      }
    }

    .unit-description {
      position: relative;
      padding-left: 1.25rem;
      color: $text-1;
      font-size: 0.85rem;
      margin-bottom: 2.5rem;

      &::before {
        content: "->";
        font-size: $size-5;
        display: block;
        position: absolute;
        top: 0;
        left: 0;
      }
    }
  }
}

.c-title {
  position: relative;
  display: flex;
  align-items: center;

  &-icon {
    display: inline-flex;
    align-items: center;
    transform: translateY(1px);
    font-size: 1.125em;
    margin-right: 0.25rem;
  }
}
</style>
