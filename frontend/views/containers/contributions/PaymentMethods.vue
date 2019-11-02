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
          span(:class='{ "has-text-1": selected !== method.name }') {{method.title}}
        span.has-text-1.c-description {{method.description}}
</template>

<script>
import Tooltip from '@components/Tooltip.vue'
import SvgBitcoin from '@svgs/bitcoin.svg'
import SvgMoney from '@svgs/money.svg'
import L from '@view-utils/translations.js'

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
          title: L('Manual'),
          isAvailable: true,
          svg: SvgMoney,
          description: L('Send your contributions using whatever method works best for you.')
        },
        {
          name: 'bitcoin',
          title: L('Bitcoin'),
          isAvailable: false,
          svg: SvgBitcoin,
          description: L('Coming soon!')
        }
      ]
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

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
      border-color: $primary_0_1;
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
  border: 2px solid $general_0;
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
