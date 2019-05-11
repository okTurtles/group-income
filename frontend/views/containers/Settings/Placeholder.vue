<template lang='pug'>
  .container
    h1.title TODO:
    p
      | Implement
      strong "{{name}}"
      |  settings page
</template>

<script>
export default {
  name: 'PlaceHolder',

  props: {
    name: String
  }
}
</script>

<style lang='scss' scoped>
@import "../../../assets/sass/theme/index";

.container {
  padding-left: 25px;
}

@include tablet {
  .title {
    margin: 15px 28px 20px 28px;
  }
}
</style>
