<template lang="pug">
modal-template
  template(#title='')
    i18n New Proposal

  template(#subtitle='')
    | {{ subTitle }}

  slot

  template(#errors='')
    | {{ submitError }}

  template(#buttons='')
    button(@click='onSubmit')
      i18n Submit Proposal
</template>

<script>
import ModalTemplate from '@components/Modal/ModalTemplate.vue'

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
