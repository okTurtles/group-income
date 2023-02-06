<template lang="pug">
.c-stat-card(:class='`is-${color}`')
  span.c-stat-desc {{ description }}
  span.is-title-1.c-stat-value {{ stat }}

  i(:class='`icon-${icon} c-icon`')
</template>

<script>
export default {
  name: 'StatCard',
  props: {
    description: String,
    stat: [Number, String],
    icon: {
      type: String,
      default: 'chart-bar',
      required: false
    },
    color: {
      type: String,
      validator: v => ['blue', 'purple'].includes(v),
      default: 'blue'
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-stat-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-end;
  width: 100%;
  height: 5.2rem;
  border-radius: 1rem;
  padding: 0.75rem 1.5rem;
  overflow: hidden;

  @include from($phone_narrow) {
    width: 13.25rem;
    height: 7rem;
    padding: 1.25rem 1.5rem;
  }

  &.is-blue {
    background-color: $primary_blue;
  }

  &.is-purple {
    background-color: $primary_purple;
  }

  > * {
    display: inline-block;
  }
}

.c-stat-desc {
  display: inline-block;

  @include from($phone_narrow) {
    margin-bottom: 0.25rem;
  }
}

.c-stat-value {
  letter-spacing: 1px;
  line-height: 1;

  @include from($phone_narrow) {
    line-height: 1.2;
  }
}

.c-icon {
  position: absolute;
  bottom: 0.2rem;
  right: 0.85rem;
  display: block;
  color: $text_1;
  opacity: 0.225;
  font: {
    size: 2.875rem;
    weight: 600;
  }
  line-height: 1;
}
</style>
