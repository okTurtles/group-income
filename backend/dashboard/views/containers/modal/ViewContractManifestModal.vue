<template lang="pug">
modal-template(:title='L("Contract manifest")' icon='suitcase')

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
