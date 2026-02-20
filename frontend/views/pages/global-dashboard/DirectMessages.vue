<template lang='pug'>
page(
  pageTestName='GlobalDirectMessages'
  pageTestHeaderName='pageHeaderName'
)
  template(#title='') {{ L('Direct Messages') }}

  .c-direct-messages-container
    i18n(tag='p') Direct Messages: Coming soon!
</template>

<script>
import Page from '@components/Page.vue'

export default {
  name: 'DirectMessages',
  components: {
    Page
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-direct-messages-container {
  position: relative;
}
</style>
