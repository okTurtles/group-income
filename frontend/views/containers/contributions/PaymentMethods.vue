<template>
  <div>
    <i18n tag="legend" class="label">Payment method</i18n>
    <ul class="field has-addons c-options" :aria-label="L('Payment Methods')">
      <li class="control" v-for="(method, index) in methodsAvailable" :key="index">
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

    <template v-if="userIsGiver">
      <i18n tag="p" class="c-info">
        Each month, after the group's mincome and pledges are finalized, you'll receive a notification that it's time to send your pledged contribution to other group members.
      </i18n>
      <i18n tag="p" class="c-info">
        With manual payments, you can manually send your pledge using any method that works for you and and the recipient(s). Once you send the pledge, be sure to click "Mark as paid" under "Pay Group" so the recipient knows to expect it. After receiving the pledge, the recipient will be sure to mark it as "Received", so you'll know it went through.
      </i18n>
    </template>
    <template v-else>
      <i18n tag="p" class="c-info">
        Each month, after the group's mincome and pledges are finalized, members will receive a notification that it's time to send their contributions to other group members.
      </i18n>
      <i18n tag="p" class="c-info">
        With manual payments, members can manually send pledges using any method that works for the giving and the receiving group member(s). Once the pledge is sent, you will receive a notification so you know to expect the pledge. After receiving the pledge, be sure to mark it as "Received" so the sender will know it went through.
      </i18n>
    </template>
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
  name: 'PaymentsMethod',
  components: {
    Tooltip
  },
  props: {
    userIsGiver: Boolean,
    active: {
      type: String,
      default: 'manual'
    }
  },
  computed: {
    methodsAvailable () {
      // REVIEW - should it be static or from $store?
      return [
        {
          name: 'manual',
          available: true,
          logo: null
        },
        {
          name: 'bitcoin',
          available: false,
          logo: '/assets/images/bitcoin.png'
        }
      ]
    }
  }
}
</script>
