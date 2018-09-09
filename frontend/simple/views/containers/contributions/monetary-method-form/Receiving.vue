<template>
  <monetary-method-template
    :title="L('Receiving Mincome')"
    :methodActive="methodActive"
    @method-change="updatePaymentMethod"
    :submitText="L('Save changes')"
    @submit="handleSubmit"
  >
    <manual-payment v-if="methodActive === 'manual'"
      ref="manual"
      :legend="L('A helping text about how receiving manual mincome works, so the user knows what’s going on.')"
      :groupCurrency="groupCurrency"
      :value="getManualAmount"
    ></manual-payment>
    <bitcoin-payment v-if="methodActive === 'bitcoin'"></bitcoin-payment>
  </monetary-method-template>
</template>
<script>
import sbp from '../../../../../../shared/sbp.js'
import { CLOSE_MODAL } from '../../../../utils/events.js'
import mixinPayment from './shared/mixinPayment.js'

export default {
  name: 'Receiving',
  mixins: [mixinPayment],
  computed: {
    getManualAmount () {
      return 500
    }
  },
  methods: {
    handleSubmit () {
      const method = this.methodActive
      const amount = this.$refs.manual.$refs.input.value
      console.log('TODO BE: Update Receiving Mincome method width:', {method}, {amount})
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  }
}
</script>
