<template lang="pug">
  .c-avatar(
    v-if='showFallback'
    v-on='$listeners'
  )
  img.c-avatar(
    v-else
    :src='src'
    :alt='alt'
    v-on='$listeners'
  )
</template>

<script>
export default {
  name: 'Avatar',
  props: {
    src: String,
    alt: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      showFallback: false
    }
  },
  methods: {
    handleFallback () {
      this.showFallback = true
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-avatar {
  border-radius: 50%;
  background-color: $border;
  object-fit: cover;
  width: 2rem;

  &:after {
    content: "";
    display: block;
    padding-bottom: 100%;
  }
}
</style>
