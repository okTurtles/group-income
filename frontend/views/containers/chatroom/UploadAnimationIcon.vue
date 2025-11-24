<template lang="pug">
.c-upload-animation-container
  svg(
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 50 50'
    preserveAspectRatio='xMidYMid meet'
  )
    circle.c-circle(cx='25' cy='25' r='20' fill='none')

  i.icon-arrow-up
</template>

<script>
export default {
  name: 'UploadAnimationIcon'
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-upload-animation-container {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
