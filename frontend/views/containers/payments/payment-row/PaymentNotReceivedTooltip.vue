<template lang='pug'>
  tooltip.c-tooltip-warning(
    direction='top'
    :isTextCenter='true'
    :text='L("{member} marked this payment as not received.", { member })'
  )
    .button.is-icon-smaller.c-tip
      i.icon-info
    i18n.pill.is-warning Not received
</template>

<script>
import Tooltip from '@components/Tooltip.vue'

export default {
  name: 'PaymentNotReceivedTooltip',
  components: {
    Tooltip
  },
  props: {
    member: String
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-tooltip-warning {
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
