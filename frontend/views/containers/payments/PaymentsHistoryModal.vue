<template lang='pug'>
modal-base-template(:fullscreen='true' :a11yTitle='L("Payments History")')
  | TODO: Implement Payments History
</template>

<script>
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'

export default ({
  name: 'PlaceHolder',
  components: {
    ModalBaseTemplate
  },
  props: {
    name: String
  }
}: Object)
</script>
