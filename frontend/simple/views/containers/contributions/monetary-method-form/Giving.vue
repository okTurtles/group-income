<template>
  <modal-template
    :title="L('Giving Mincome')"
    :submitText="L('Add monetary method')"
    :onSubmit="handleSubmit"
  >
    <payment-methods ref="form"
      :legend="L('A helping text about giving mincome, so the user knows what’s going on.')"
    ></payment-methods>
  </modal-template>
</template>
<script>
import sbp from '../../../../../../shared/sbp'
import { CLOSE_MODAL } from '../../../../utils/events'
import ModalTemplate from './shared/ModalTemplate.vue'
import PaymentMethods from './shared/PaymentMethods.vue'

export default {
  name: 'Receiving',
  components: {
    ModalTemplate,
    PaymentMethods
  },
  methods: {
    handleSubmit () {
      const form = this.$refs.form
      const method = form.methodActive
      const amount = form.$refs.input.value
      console.log('TODO BE: Add Giving Mincome method width:', {method}, {amount})
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  }
}
</script>
