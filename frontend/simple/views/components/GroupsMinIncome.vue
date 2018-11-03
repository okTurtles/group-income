<template>
  <div class="has-text-right">
    <p class="has-text-grey c-text">Min Income</p>
    <p class="title is-2 is-marginless" data-test="minIncome">
      {{ currency }}{{ group.incomeProvided }}
    </p>
    <button class="gi-is-unstyled gi-is-link" @click="openProposal">
      <i18n>Propose change</i18n>
    </button>
  </div>
</template>
<style lang="scss" scoped>
@import "../../assets/sass/theme/index";

.c-text {
  margin-top: -$gi-spacer-sm*1.5;
  margin-bottom: -$gi-spacer-sm;
}
</style>
<script>
import sbp from '../../../../shared/sbp.js'
import { OPEN_MODAL } from '../../utils/events.js'
import currencies from '../utils/currencies.js'
import Mincome from '../containers/proposals-form/Mincome.vue'

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
      sbp('okTurtles.events/emit', OPEN_MODAL, Mincome)
    }
  }
}
</script>
