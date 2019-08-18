<template lang="pug">
.c-progress
  .c-primary(
    :style='{ width: primary + "%" }'
  )
  .c-secondary(
    v-if='secondary'
    :style='{ width: secondary + "%" }'
  )
</template>

<script>
export default {
  name: 'ProgressBar',
  props: {
    primary: Number,
    secondary: Number
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-progress {
  position: relative;
  width: 100%;
  height: $spacer-xs;
  background-color: $primary_2;
  margin-top: 1rem;
}

.c-primary,
.c-secondary {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  // Animation to modify the bar
  transition: width 450ms ease-in-out;
  // Animation to show up the bar
  transform: scaleX(0);
  transform-origin: 0 0;
}

.c-primary {
  background-color: $primary_0;
  // this bar is slower: starts sooner and ends later
  animation: progress 700ms ease-in-out 450ms forwards;
}

.c-secondary {
  background-color: $success_0;
  animation: progress 500ms ease-in-out 550ms forwards;
}

@keyframes progress {
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}
</style>
