<template lang='pug'>
main
  i18n.c-page-header(tag='h1') Users

  i18n(tag='p') This is 'users' page
</template>

<script>
export default {
  name: 'Users'
}
</script>

<style lang='scss' scoped>
.c-page-header {
  margin-top: 2rem;
  margin-bottom: 4.5rem;
}
</style>
