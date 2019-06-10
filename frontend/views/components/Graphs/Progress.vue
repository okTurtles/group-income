<template lang="pug">
span.c-progress
  span.c-primary(
    :style='{ width: primary }'
  )
  span.c-secondary(
    v-if='secondary'
    :style='{ width: secondary }'
  )
</template>

<script>
export default {
  name: 'ProgressBar',
  props: {
    primary: String,
    secondary: String
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: $spacer-xs;
  background-color: $primary-bg-a;
  box-shadow: inset 0 0 1px $primary;
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
