<template lang="pug">
.c-stat-card(:class='`is-${color}`')
  span.c-stat-desc {{ description }}
  span.is-title-1.c-stat-value {{ stat }}
</template>

<script>
export default {
  name: 'StatCard',
  props: {
    description: String,
    stat: [Number, String],
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
  justify-content: center;
  width: 12.5rem;
  height: 7rem;
  border-radius: 1rem;
  padding: 1.25rem 1.5rem;

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
  margin-bottom: 0.25rem;
}

.c-stat-value {
  letter-spacing: 1px;
  line-height: 1.2;
}
</style>
