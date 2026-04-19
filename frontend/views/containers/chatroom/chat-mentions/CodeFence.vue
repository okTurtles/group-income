<template lang="pug">
  pre.c-code-fence
    code {{ content }}
</template>

<script>
export default {
  props: {
    content: {
      type: String,
      required: true
    }
  }
}
</script>

<style lang="scss" scoped>
.c-code-fence {
  position: relative;
  display: block;
}
</style>
