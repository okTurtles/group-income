<template lang='pug'>
section.card
  h3.title(v-if='title') {{ title }}
  slot
</template>

<script>
export default {
  name: 'PageSection',
  props: {
    title: String
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

</style>
