<template lang='pug'>
modal-base-template(:fullscreen='true')
  | TODO: Implement Group Members modal
</template>

<script>
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'

export default {
  name: 'GroupMembersAllModal',
  components: {
    ModalBaseTemplate
  },
  props: {
    name: String
  }
}
</script>
