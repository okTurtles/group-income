<template>
  <img :src="src" :alt="alt" class="c-avatar"/>
</template>
<style lang="scss" scoped>
@import "../../assets/sass/theme/index";

.c-avatar {
  width: $gi-spacer*3;
  max-width: $gi-spacer*3;
  height: $gi-spacer*3;
  border-radius: 50%;
  margin-right: 0.5rem;
}
</style>
<script>
// TODO: Replace all avatars for this component
export default {
  name: 'Avatar',
  props: {
    src: String,
    alt: String
  }
}
</script>
