<template lang='pug'>
li.c-wlegend
  .c-inner
    span.has-text-1.c-desc
      slot
    span.is-title-4.c-amount
      | {{ amount }}
      span.c-marker(:class='`has-background-${color}`')
  .c-description.help(v-if='$slots.description')
    slot(name='description')
</template>

<script>
export default {
  name: 'GraphLegendItem',
  props: {
    amount: {
      type: String,
      required: true
    },
    color: {
      type: String,
      required: true
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-wlegend {
  padding: $spacer 0;

  &.c-wlegend-side {
    &:first-child {
      padding-top: 0;
    }

    &:last-child {
      padding-bottom: 0;
    }

    &:not(:last-child) {
      border-bottom: 1px solid $general_0;
    }
  }

  @include tablet {
    &.c-wlegend-inline {
      position: relative;
      margin-right: 2.5rem;
      padding-left: 1rem;

      .c-marker {
        position: absolute;
        left: 0;
        top: 1.45rem;
        margin-left: 0;
      }
    }
  }
}

.c-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.c-desc {
  display: block;
  margin-right: $spacer-sm;
}

.c-amount {
  white-space: nowrap;
}

.c-marker {
  display: inline-block;
  width: $spacer-sm;
  height: $spacer-sm;
  margin-left: $spacer-sm;
  margin-bottom: 0.06rem; // visually aligned
  border-radius: 1px;
  border: 1px solid;

  &.has-background-blank {
    border-color: $general_0;
  }

  &.has-background-primary-solid {
    border-color: $primary_0;
  }

  &.has-background-success-solid {
    border-color: $success_0;
  }

  &.has-background-warning-solid {
    border-color: $warning_0;
  }
}

.c-description {
  margin-top: $spacer-sm;
}
</style>
