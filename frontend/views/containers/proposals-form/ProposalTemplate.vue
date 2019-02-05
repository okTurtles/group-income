<template>
  <modal :submitError="submitError">
    <template #title>
      <i18n>New Proposal</i18n>
    </template>
    
    <template #subTitle>
      {{ subTitle }}
    </template>
    
    <slot></slot>

    <template #buttons>
      <button class="button is-primary" @click="onSubmit">
        <i18n>Submit Proposal</i18n>
      </button>
    </template>
  </modal>
</template>
<script>
import Modal from '../../components/Modal/Modal.vue'

export default {
  name: 'ModalForm',
  components: {
    Modal
  },
  props: {
    subTitle: String,
    submitError: String,
    onSubmit: Function
  }
}
</script>
