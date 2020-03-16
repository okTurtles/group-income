<template lang='pug'>
.c-progress(
    :class='{ "is-completed": percent === "100%", "has-marks": hasMarks }'
  )
  .c-bg
  .c-marks(
    v-if='hasMarks'
    :style='marksStyle'
  )
  .c-bar(
    :style='{ width: percent }'
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
        : this.$store.getters.colors.general_0

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
@import "@assets/style/_variables.scss";

.c-progress {
  position: relative;
  height: 0.5rem;

  &.has-marks {
    height: 1rem;
  }
}

.c-bg,
.c-bar {
  position: absolute;
  width: 100%;
  height: 0.5rem;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  border-radius: 0.5rem;
}

.c-bg {
  background-color: $general_0;
}

.c-bar {
  background-color: $primary_0;
  // Animation to modify the bar
  transition: width 450ms ease-in-out;
  // Animation to show up the bar
  transform: translateY(-50%) scaleX(0);
  transform-origin: 0 0;
  animation: progress 700ms ease-out 350ms forwards;

  .js-reducedMotion & {
    transform: translateY(-50%) scaleX(1);
  }

  .is-completed & {
    background-color: $success_0;
  }

  .has-marks:not(.is-completed) & {
    border-radius: 0.5rem 0 0 0.5rem;
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
