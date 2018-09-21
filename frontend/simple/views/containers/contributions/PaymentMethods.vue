<template>
  <div>
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
    <i18n tag="p" class="c-info">A short but clear text explaining how “Manual” payment works, so the user understands well the process.</i18n>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-options {
  display: flex;

  &-logo {
    &.is-bitcoin { width: 4.3rem; }
  }

  .button {
    text-transform: capitalize;
    height: $gi-spacer-lg;

    &.is-primary {
      z-index: 2; // Show all border

      &:focus {
        background-color: transparent;
        color: $text;
      }
    }
  }
}

.c-info {
  margin: $gi-spacer 0;
}
</style>
<script>
import Tooltip from '../../components/Tooltip.vue'

export default {
  name: 'Receiving',
  components: {
    Tooltip
  },
  props: {
    active: {
      type: String,
      default: 'manual'
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
          available: false,
          logo: '/simple/assets/images/bitcoin.png'
        }
      ]
    }
  }
}
</script>
