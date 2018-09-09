<template>
  <modal-template
    :title="L('Receiving Mincome')"
    :submitText="L('Save changes')"
    :onSubmit="handleSubmit"
  >
    <payment-methods :active="methodActive" @change="updatePaymentMethod"></payment-methods>

    <manual-payment v-if="isManual"
      :legend="L('A helping text about how receiving manual mincome works, so the user knows what’s going on.')"
      :groupCurrency="groupCurrency"
      :value="getManulAmount"
    ></manual-payment>
    <bitcoin-payment v-if="isBitcoin"
      :legend="L('A helping text about how receiving bitcoin mincome works, so the user knows what’s going on.')"
      :value="getBitcoin"
    ></bitcoin-payment>
  </modal-template>
</template>
<script>
import sbp from '../../../../../../shared/sbp.js'
import { CLOSE_MODAL } from '../../../../utils/events.js'
import currencies from '../../../utils/currencies.js'
import ModalTemplate from './shared/ModalTemplate.vue'
import PaymentMethods from './shared/PaymentMethods.vue'
import ManualPayment from './shared/ManualPayment.vue'
import BitcoinPayment from './shared/BitcoinPayment.vue'

export default {
  name: 'Receiving',
  components: {
    ModalTemplate,
    PaymentMethods,
    ManualPayment,
    BitcoinPayment
  },
  data () {
    return {
      methodActive: 'manual'
    }
  },
  computed: {
    isManual () {
      return this.methodActive === 'manual'
    },
    isBitcoin () {
      return this.methodActive === 'bitcoin'
    },
    getManulAmount () {
      return 500
    },
    getBitcoit () {
      return { address: '1234567890987654321234567890', amount: 2 }
    },
    groupCurrency () {
      const groupCurrency = 'USD'
      return `${currencies[groupCurrency]} ${groupCurrency}`
    }
  },
  methods: {
    updatePaymentMethod (method) {
      this.methodActive = method
    },
    handleSubmit () {
      const form = this.$refs.form
      const method = form.methodActive
      const amount = form.$refs.input.value
      console.log('TODO BE: Update Receiving Mincome method width:', {method}, {amount})
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  }
}
</script>
