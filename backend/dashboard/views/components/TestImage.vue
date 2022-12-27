<template lang="pug">
.c-image
  img(src='/assets/images/group-income-icon-transparent.png')

  p
    span random string hahah12321
    i.icon-comments
</template>

<script>
export default {
  name: 'TestImage'
}
</script>

<style scoped>
.c-image {
  display: flex;
  justify-content: center;
  margin-top: 30px;
  margin-bottom: 30px;
}

img {
  display: inline-block;
  width: 160px;
  height: 160px;
}
</style>
