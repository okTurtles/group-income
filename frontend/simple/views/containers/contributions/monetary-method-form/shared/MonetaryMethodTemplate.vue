<template>
  <div>
    <modal-header>
      <i18n>{{title}}</i18n>
    </modal-header>

    <modal-body class="c-body">
      <payment-methods
        :active="methodActive"
        @change="(method) => $emit('method-change', method)"
      ></payment-methods>

      <slot></slot>
    </modal-body>

    <modal-footer :submitError="submitError">
      <button class="button is-primary is-large" @click="$emit('submit')">
        <i18n>{{submitText}}</i18n>
      </button>
    </modal-footer>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../../../assets/sass/theme/index";

.c-body {
  max-width: 30rem;
  padding-top: 0;
}
</style>
<script>
import ModalHeader from '../../../../components/Modal/ModalHeader.vue'
import ModalBody from '../../../../components/Modal/ModalBody.vue'
import ModalFooter from '../../../../components/Modal/ModalFooter.vue'
import PaymentMethods from './PaymentMethods.vue'

export default {
  name: 'ModalForm',
  components: {
    ModalHeader,
    ModalBody,
    ModalFooter,
    PaymentMethods
  },
  props: {
    title: String,
    submitText: String,
    submitError: String,
    methodActive: {
      type: String,
      required: true
    },
    onSubmit: Function
  }
}
</script>
