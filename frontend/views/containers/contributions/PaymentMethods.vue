<template lang='pug'>
fieldset
  i18n.label(tag='legend') Payment methods
  ul.c-list
    li.c-item(
      v-for='(method, index) in methodsAvailable'
      :key='`method-${index}`'
    )
      button.is-unstyled.c-button(
        type='button'
        :disabled='!method.isAvailable'
        :aria-pressed='selected === method.name'
        @click='$emit("select", method.name)'
      )
        .c-svg
          component(:is='method.svg')
        .radio.c-radio
          .input(:class='{ "is-checked": selected === method.name }')
          span(:class='{ "has-text-1": selected !== method.name }') {{method.name}}
        span.has-text-1.c-description {{method.description}}
</template>

<script>
import Tooltip from '@components/Tooltip.vue'
import SvgBitcoin from '@svgs/bitcoin.svg'
import SvgMoney from '@svgs/money.svg'

export default {
  name: 'PaymentsMethod',
  components: {
    SvgBitcoin,
    SvgMoney,
    Tooltip
  },
  props: {
    selected: {
      type: String,
      required: true,
      validator: (method) => ['manual', 'bitcoin'].includes(method)
    }
  },
  computed: {
    methodsAvailable () {
      return [
        {
          name: 'manual',
          isAvailable: true,
          svg: SvgMoney,
          description: 'Send your contributions using whatever method works best for you.'
        },
        {
          name: 'bitcoin',
          isAvailable: false,
          svg: SvgBitcoin,
          description: 'Coming soon!'
        }
      ]
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-list {
  display: flex;
}

.c-item {
  display: block;
  width: calc(50% - #{$spacer-sm});

  &:nth-child(odd) {
    margin-right: $spacer;
  }
}

.c-button {
  display: block;
  width: 100%;
  white-space: normal;
  line-height: inherit;

  &[disabled] {
    background-color: transparent;
    opacity: 1;
    cursor: not-allowed;

    &:hover,
    &:focus {
      background: transparent;
    }
  }

  &:hover:not([disabled]),
  &:focus {
    background: transparent;

    .c-svg {
      border-color: $text_0;
    }
  }
}

.c-svg {
  height: 4.5rem;
  border: 1px solid $general_0;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: $spacer;

  [aria-pressed="true"] & {
    border-color: $primary_0;
  }

  svg {
    height: 3rem;
  }
}

.c-description {
  display: block;
  margin-top: $spacer-xs;
}
</style>
