<template lang="pug">
.c-progress(
    :class='{ "is-completed": percent === "100%", "has-marks": hasMarks }'
  )
  .c-bg
  .c-bar(
    :style='{ width: percent }'
  )
  .c-marks(
    v-if="hasMarks"
    :style="marksStyle"
  )
</template>

<script>
export default {
  name: 'ProgressBar',
  props: {
    max: Number,
    value: Number,
    hasMarks: Boolean
  },
  computed: {
    percent () {
      return `${100 * this.value / this.max}%`
    },
    marksStyle () {
      const color = this.percent === '100%'
        ? this.$store.getters.colors.success_0
        : this.$store.getters.colors.primary_0

      const percent = `${100 / this.max}%`
      const markWidth = '2px'
      const gap = `calc(${percent} - ${markWidth})`

      return {
        background: `repeating-linear-gradient(to right,
          transparent 0,
          transparent ${gap},
          ${color} ${gap},
          ${color} ${percent}
        )`
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-progress {
  position: relative;
  height: $spacer-sm;

  &.has-marks {
    height: $spacer;
  }
}

.c-bg,
.c-bar {
  position: absolute;
  width: 100%;
  height: $spacer-sm;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  border-radius: $spacer-sm;
}

.c-bg {
  background-color: $general_0;
}

.c-bar {
  background-color: $primary_0;
  // Animation to modify the bar
  transition: width 450ms ease-in-out;
  // Animation to show up the bar
  transform: scaleX(0);
  transform-origin: 0 0;
  animation: progress 700ms ease-out 350ms forwards;

  .is-completed & {
    background-color: $success_0;
  }

  .has-marks:not(.is-completed) & {
    border-radius: $spacer-sm 0 0 $spacer-sm;
  }
}

.c-marks {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  // hide last marker
  $edge: calc(100% - 2px);
  clip-path: polygon(0 0, $edge 0, $edge 100%, 0 100%);
}

@keyframes progress {
  from {
    transform: translateY(-50%) scaleX(0);
  }
  to {
    transform: translateY(-50%) scaleX(1);
  }
}
</style>
