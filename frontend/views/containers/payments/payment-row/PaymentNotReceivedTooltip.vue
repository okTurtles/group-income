<template lang='pug'>
  tooltip.c-tooltip-warning(
    direction='top'
    :isTextCenter='true'
    :text='L("{member} marked this payment as not received.", { member })'
  )
    .button.is-icon-smaller.c-tip
      i.icon-info
    i18n.pill.is-warning.c-tip-text(v-if='!hideText') Not received
</template>

<script>
import Tooltip from '@components/Tooltip.vue'

export default ({
  name: 'PaymentNotReceivedTooltip',
  components: {
    Tooltip
  },
  props: {
    member: String,
    hideText: {
      type: Boolean,
      required: false,
      default: false
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-tooltip-warning {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  outline: none;

  .c-tip {
    background: $warning_0;
  }

  &:focus .c-tip {
    box-shadow: 0 0 4px $primary_0;
  }
}

// TODO: check if we need generic rule for this (keep until we know)
// .c-tooltip {
//   @each $name in $colors {
//     &-#{$name} .c-tip{
//       background: var(--#{$name}_0);
//     }
//   }
// }

.c-tip {
  margin-left: 0.5rem;
  margin-right: 0.25rem;

  &,
  &:hover {
    color: #fff;
  }
}
</style>
