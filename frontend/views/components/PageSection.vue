<template lang='pug'>
section.card
  h3.title.c-title(v-if='title') 
    | {{ title }}
    slot(name='cta')
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

.c-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
