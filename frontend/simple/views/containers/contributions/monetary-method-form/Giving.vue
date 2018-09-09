<template>
  <monetary-method-template
    :title="L('Giving Mincome')"
    :methodActive="methodActive"
    @method-change="updatePaymentMethod"
    :submitText="submitText"
    @submit="handleSubmit"
  >
    <manual-payment v-if="methodActive === 'manual'"
      ref="manual"
      :legend="L('A helping text about how giving mincome works, so the user knows what’s going on.')"
      :groupCurrency="groupCurrency"
    ></manual-payment>
    <bitcoin-payment v-if="methodActive === 'bitcoin'"></bitcoin-payment>
  </monetary-method-template>
</template>
<script>
import sbp from '../../../../../../shared/sbp.js'
import { CLOSE_MODAL } from '../../../../utils/events.js'
import mixinPayment from './shared/mixinPayment.js'

export default {
  name: 'Giving',
  mixins: [mixinPayment],
  computed: {
    submitText () {
      const hasMethodCreated = false
      return hasMethodCreated ? this.L('Save changes') : this.L('Add monetary method')
    }
  },
  methods: {
    handleSubmit () {
      const method = this.methodActive
      const amount = this.$refs.manual.$refs.input.value
      console.log('TODO BE: Add Giving Mincome method width:', {method}, {amount})
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  }
}
</script>
