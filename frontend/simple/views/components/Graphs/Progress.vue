<template>
  <span class="c-progress">
    <span class="c-primary" :style="{ width: primary }"></span>
    <span class="c-secondary" :style="{ width: secondary }" v-if="secondary"></span>
  </span>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: $gi-spacer-xs;
  background-color: $primary-bg-a;
  box-shadow: inset 0 0 1px $primary;
}

.c-primary,
.c-secondary {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  // Animation to speed up the progress bars
  transition: width 250ms ease-in-out;
  transform: scaleX(0);
  transform-origin: 0 0;
}

.c-primary {
  background-color: $primary;
  // this bar is slower: starts sooner and ends later
  animation: progress 700ms ease-in-out 450ms forwards;
}

.c-secondary {
  background-color: $success;
  animation: progress 500ms ease-in-out 550ms forwards;
}

@keyframes progress {
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}
</style>
<script>
export default {
  name: 'ProgressBar',
  props: {
    primary: Number,
    secondary: Number
  }
}
</script>
