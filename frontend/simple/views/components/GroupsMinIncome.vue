<template>
  <div>
    <div class="has-text-right">
      <p class="min-income-label has-text-grey">Min Income</p>
      <p class="min-income title is-1 is-marginless"
        data-test="minIncome">
        {{ currency }}{{ group.incomeProvided }}
      </p>
      <a href="#" @click="openProposal">
        <i18n>Propose change</i18n>
      </a>
    </div>
  </div>
</template>
<script>
import sbp from '../../../../shared/sbp.js'
import { OPEN_MODAL } from '../../utils/events.js'
import { symbol } from '../utils/currencies.js'
import Mincome from '../containers/proposals-form/Mincome.vue'

export default {
  name: 'GroupsMinIncome',
  props: {
    group: Object
  },
  computed: {
    currency: function () {
      return symbol(this.group.incomeCurrency)
    }
  },
  methods: {
    openProposal () {
      sbp('okTurtles.events/emit', OPEN_MODAL, Mincome)
    }
  }
}
</script>
