<template lang="pug">
div
  i18n.label(tag='legend') Payment method
  ul.field.has-addons.c-options(:aria-label="L('Payment Methods')")
    li.control(
      v-for='(method, index) in methodsAvailable'
      :key='`method-${index}`'
    )
      button.is-outlined(
        v-if='method.available'
        :class="{ 'is-primary': active === method.name }"
        :aria-pressed='active === method.name'
        @click="$emit('change', method.name)"
      )
        img.c-options-logo(
          v-if='method.logo'
          :alt='method.name'
          :src='method.logo'
          :class='`is-${method.name}`'
        )
        template(v-else='') {{method.name}}

      tooltip(v-else='' :text="L('Available soon')")
        button.is-outlined(disabled='')
          img.c-options-logo(
            :alt='method.name'
            :src='method.logo'
            :class='`is-${method.name}`'
          )

  template(v-if='userIsGiver')
    i18n.help(tag='p')
      | Each month, after the group&apos;s mincome and pledges are finalized, you&apos;ll receive a notification that it&apos;s time to send your pledged contribution to other group members.

    i18n.help(tag='p')
      | With manual payments, you can manually send your pledge using any method that works for you and and the recipient(s). Once you send the pledge, be sure to click &quot;Mark as paid&quot; under &quot;Pay Group&quot; so the recipient knows to expect it. After receiving the pledge, the recipient will be sure to mark it as &quot;Received&quot;, so you&apos;ll know it went through.

  template(v-else='')
    i18n.help(tag='p')
      | Each month, after the group&apos;s mincome and pledges are finalized, members will receive a notification that it&apos;s time to send their contributions to other group members.

    i18n.help(tag='p')
      | With manual payments, members can manually send pledges using any method that works for the giving and the receiving group member(s). Once the pledge is sent, you will receive a notification so you know to expect the pledge. After receiving the pledge, be sure to mark it as &quot;Received&quot; so the sender will know it went through.

</template>

<script>
import Tooltip from '@components/Tooltip.vue'

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

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-options {
  display: flex;

  &-logo {
    &.is-bitcoin { width: 4.3rem; }
  }

  .button {
    text-transform: capitalize;
    height: $spacer-lg;

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
