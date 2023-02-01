<template lang='pug'>
main
  i18n.c-page-header(tag='h1') Dashboard

  i18n(tag='p') this is 'dashboard' page
</template>

<script>
export default {
  name: 'Dashboard'
}
</script>

<style lang='scss' scoped>
.c-page-header {
  margin-top: 2rem;
  margin-bottom: 4.5rem;
}
</style>
