<template>
  <modal-template>
    <template #title>
      <i18n>New Proposal</i18n>
    </template>

    <template #subTitle>
      {{ subTitle }}
    </template>

    <slot></slot>

    <template #errors>
      {{ submitError }}
    </template>

    <template #buttons>
      <button class="button is-primary" @click="onSubmit">
        <i18n>Submit Proposal</i18n>
      </button>
    </template>
  </modal-template>
</template>
<script>
import ModalTemplate from '../../components/Modal/ModalTemplate.vue'

export default {
  name: 'ModalForm',
  components: {
    ModalTemplate
  },
  props: {
    subTitle: String,
    submitError: String,
    onSubmit: Function
  }
}
</script>
