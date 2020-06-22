<template lang='pug'>
  modal-base-template(class='has-background' ref='modal' :a11yTitle='L("Loading")' v-else)
    .wrapper-container
      i18n Loading...

    .loading-box

</template>

<script>
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'

export default {
  name: 'LoadingModal',
  components: {
    ModalBaseTemplate
  }
}
</script>

<style lang="scss" scoped>
.wrapper-container {
  height: 100%;
  width: 100%;
  opacity: 1;
  background-color: $general_2;
}
</style>
