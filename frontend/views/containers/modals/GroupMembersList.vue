<template lang='pug'>
modal-base-template(:fullscreen='true')
  | TODO: Implement Group Members modal
</template>

<script>
import ModalBaseTemplate from '@components/Modal/ModalBaseTemplate.vue'

export default {
  name: 'PlaceHolder',
  components: {
    ModalBaseTemplate
  },
  props: {
    name: String
  }
}
</script>
