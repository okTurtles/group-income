<template lang='pug'>
main
  i18n.c-page-header(tag='h1') Billing

  i18n(tag='p') This is 'billing' page
</template>

<script>
export default {
  name: 'Billing'
}
</script>

<style lang='scss' scoped>
.c-page-header {
  margin-top: 2rem;
  margin-bottom: 4.5rem;
}
</style>
