<template lang="pug">
div
  label.label Minimum Income

  p.income-provided(data-test='minIncome')
    | {{ currency }}{{ group.incomeProvided }}

  button.link(@click='openProposal')
    i18n Change
</template>

<script>
import sbp from '~/shared/sbp.js'
import { LOAD_MODAL } from '@utils/events.js'
import currencies from '@view-utils/currencies.js'

export default {
  name: 'GroupsMinIncome',
  props: {
    group: Object
  },
  computed: {
    currency: function () {
      return currencies[this.group.incomeCurrency]
    }
  },
  methods: {
    openProposal () {
      sbp('okTurtles.events/emit', LOAD_MODAL, 'Mincome')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.income-provided {
  font-size: $size-large;
  font-weight: bold;
  margin: $spacer-sm 0;
}
</style>
