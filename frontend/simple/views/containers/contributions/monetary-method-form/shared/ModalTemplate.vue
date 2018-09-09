<template>
  <div>
    <modal-header>
      <i18n>{{title}}</i18n>
    </modal-header>

    <modal-body class="c-body">
      <slot></slot>
    </modal-body>

    <modal-footer :submitError="submitError">
      <button class="button is-primary is-large" @click="onSubmit">
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

export default {
  name: 'ModalForm',
  components: {
    ModalHeader,
    ModalBody,
    ModalFooter
  },
  props: {
    title: String,
    submitText: String,
    submitError: String,
    onSubmit: Function
  }
}
</script>
