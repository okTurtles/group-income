<template lang='pug'>
  modal-base-template(class='has-background' ref='modal' :a11yTitle='L("Loading")' :loading='true')
    .wrapper-container
      .container
        i18n(tag='h2' class='is-title-2 c-title') Loading...

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
@import "@assets/style/_variables.scss";

.wrapper-container {
  height: 100%;
  width: 100%;
  opacity: 1;
  background-color: $general_2;
}

.container {
  max-width: 66vw;
  margin: 0 auto;
}

.c-title {
  padding: 2.5rem 0 1rem 0;
}
</style>
