<template lang="pug">
div
  i18n.label(tag='label') Minimum Income

  p.income-provided(data-test='minIncome')
    | {{ currency }}{{ group.incomeProvided }}

  i18n.link(
    tag='button'
    @click='openProposal'
  ) Change
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
      sbp('okTurtles.events/emit', LOAD_MODAL, 'MincomeProposal')
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
