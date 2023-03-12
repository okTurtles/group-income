<template lang="pug">
modal-template
  template(#title='')
    i18n Contract manifest

  i18n(tag='p') This is a random content...
  p {{ contract.type }}
</template>

<script>
import ModalTemplate from './ModalTemplate.vue'

export default {
  name: 'ViewContractManifestModal',
  components: {
    ModalTemplate
  },
  props: {
    contract: Object
  }
}
</script>
