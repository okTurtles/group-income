<template lang='pug'>
div
  i18n.c-page-header(tag='h1') Accounts

  i18n(tag='p') This is 'accounts' page
</template>

<script>
export default ({
  name: 'Accounts'
}: Object)
</script>

<style lang='scss' scoped>
.c-page-header {
  margin-top: 2rem;
  margin-bottom: 4.5rem;
}
</style>
