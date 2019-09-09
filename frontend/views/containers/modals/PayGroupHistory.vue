<template lang='pug'>
modal-base-template
  .wrapper-container
    | TODO: Implement Pay Group History
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

<style lang='scss' scoped>
@import "../../../assets/style/_variables.scss";

.wrapper-container {
  height: 100%;
  width: 100%;
  opacity: 1;
  background: $general_0;
}
</style>
