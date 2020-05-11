<template lang='pug'>
.c-progress(
    :class='{ "is-completed": percent === "100%", "has-marks": hasMarks }'
  )
  .c-bg
  .c-marks(v-if='hasMarks' :style='marksStyle')
  .c-bar.is-soft(v-if='percentSoft' :style='`width: ${percentSoft}; ${ephemeral.widthZero}`')
  .c-bar(:style='`width: ${percent}; ${ephemeral.widthZero}`')
</template>

<script>
export default {
  name: 'ProgressBar',
  props: {
    max: Number,
    value: Number,
    secValue: Number, // When there's a 2nd value, e.g MonthOverview
    hasMarks: Boolean
  },
  data: () => ({
    ephemeral: {
      widthZero: 'width: 0;'
    }
  }),
  mounted () {
    // Animate the progressBar width from 0 to this.percent on first render:
    // 1.On the first render, the width must be zero. (widthZero)
    // 2. Wait for the component to be mounted and the DOM processed.
    setTimeout(() => {
      // 3. Finally remove the widthZero, and it will animate from 0 to this.percent.
      this.ephemeral.widthZero = ''
    }, 0)
  },
  computed: {
    percent () {
      return `${100 * this.value / this.max}%`
    },
    percentSoft () {
      if (!this.secValue) return false
      return `${100 * this.secValue / this.max}%`
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
  transition: width 450ms ease-out;

  .is-completed & {
    background-color: $success_0;
  }

  .has-marks:not(.is-completed) & {
    border-radius: 0.5rem 0 0 0.5rem;
  }

  &.is-soft {
    background-color: $primary_1;
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
</style>
