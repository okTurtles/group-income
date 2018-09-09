<template>
  <ul class="field has-addons c-options" :aria-label="L('Payment Methods')">
    <li class="control" v-for="method in methodsAvailable">
      <button v-if="method.available"
        class="button is-outlined"
        :class="{ 'is-primary': active === method.name }"
        :aria-pressed="active === method.name"
        @click="$emit('change', method.name)"
      >
        <img v-if="method.logo" :alt="method.name" :src="method.logo" class="c-options-logo" :class="`is-${method.name}`">
        <template v-else>{{method.name}}</template>
      </button>
      <tooltip v-else :text="L('Available soon')">
        <button class="button is-outlined" disabled>
          <img :alt="method.name" :src="method.logo" class="c-options-logo" :class="`is-${method.name}`">
        </button>
      </tooltip>
    </li>
  </ul>
</template>
<style lang="scss" scoped>
@import "../../../../../assets/sass/theme/index";

.c-options {
  display: flex;
  justify-content: center;

  &-logo {
    &.is-bitcoin { width: 4.3rem; }
    &.is-paypal { width: 5.3rem; }
    &.is-visa { width: 2.2rem; }
  }

  .button {
    text-transform: capitalize;

    &.is-primary {
      z-index: 2; // Show all border

      &:focus {
        background-color: transparent;
        color: $text;
      }
    }
  }
}
</style>
<script>
import Tooltip from '../../../../components/Tooltip.vue'

export default {
  name: 'Receiving',
  components: {
    Tooltip
  },
  props: {
    active: {
      type: String,
      required: true
    }
  },
  computed: {
    methodsAvailable () {
      // REVIEW - should it be static or from BE?
      return [
        {
          name: 'manual',
          available: true,
          logo: null
        },
        {
          name: 'bitcoin',
          available: true, // Force just for UI purposes
          logo: '/simple/assets/images/bitcoin.png'
        },
        {
          name: 'paypal',
          available: false,
          logo: '/simple/assets/images/paypal.png'
        },
        {
          name: 'visa',
          available: false,
          logo: '/simple/assets/images/visa.png'
        }
      ]
    }
  }
}
</script>
