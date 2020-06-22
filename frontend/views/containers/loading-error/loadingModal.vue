<template lang='pug'>
  modal-template(class='has-background' ref='modal' :a11yTitle='L("Loading")')
    template(slot='title')
      i18n Loading...

    .loading-box

</template>

<script>
import ModalTemplate from '@components/modal/ModalTemplate.vue'

export default {
  name: 'LoadingModal',
  components: {
    ModalTemplate
  }
}
</script>
