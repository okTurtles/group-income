<template lang="pug">
section.p-section
  h3.title(v-if='title')
    i18n {{title}}
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
