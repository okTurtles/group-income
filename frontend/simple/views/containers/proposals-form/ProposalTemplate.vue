<template>
  <div>
    <modal-header>
      <i18n>New Proposal</i18n>
      <template slot="subTitle">{{ subTitle }}</template>
    </modal-header>

    <modal-body>
      <slot></slot>
    </modal-body>

    <modal-footer :submitError="submitError">
      <button class="button is-primary" @click="onSubmit">
        <i18n>Submit Proposal</i18n>
      </button>
    </modal-footer>
  </div>
</template>
<script>
import ModalHeader from '../../components/Modal/ModalHeader.vue'
import ModalBody from '../../components/Modal/ModalBody.vue'
import ModalFooter from '../../components/Modal/ModalFooter.vue'

export default {
  name: 'ModalForm',
  components: {
    ModalHeader,
    ModalBody,
    ModalFooter
  },
  props: {
    subTitle: String,
    submitError: String,
    onSubmit: Function
  }
}
</script>
