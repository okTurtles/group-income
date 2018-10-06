<template>
  <div class="c-container">
    <svg viewBox="-1 -1 2 2" class="c-piechart" :style="{ height: size }">
      <path v-for="(slice, index) in slices"
        :data-id="slice.id"
        :d="sliceData(slice, index)"
        :class="`c-slice gi-has-fill-${slice.color}`"
      ></path>
      <path v-if="!!missingSlice"
        data-id="_missingSlice_"
        :d="missingSlice"
        :class="`c-slice gi-has-fill-${lastSliceColor}`"
      ></path>
      <circle r="30%" class="c-pie-donut"></circle>
      <!-- TODO - inner pie chart -->
    </svg>
    <div class="c-title">
      <slot></slot>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-container {
  position: relative;
}

.c-piechart {
  transform: rotate(-90deg);
}

.c-slice {
  // Simulate a gap between each slice
  stroke: $body-background-color;
  stroke-width: 0.03; // small unit because this SVG is a 1x1 grid system
}

.c-pie-donut {
  fill: $body-background-color;
}

.c-title {
  position: absolute;
  width: 60%; // 2x .c-pie-donut radius
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  line-height: 1.2;
}
</style>
<script>
// Learn more about SVG & PieCharts
// -> https://hackernoon.com/a-simple-pie-chart-in-svg-dbdd653b6936

export default {
  name: 'PieChart',
  props: {
    slices: Array, // [{ id, percent, color }]
    lastSliceColor: {
      type: String,
      default: 'light'
    },
    size: {
      type: String,
      default: '12rem'
    }
  },
  computed: {
    missingSlice () {
      const index = this.slices.length
      const totalPercent = this.getStartPercent(index)

      if (totalPercent === 1) {
        return false
      }

      const slice = { percent: 1 - totalPercent }
      return this.sliceData(slice, index)
    }
  },
  methods: {
    sliceData (slice, index) {
      const startPoint = this.getStartPercent(index)
      const [ startX, startY ] = this.getCoordinatesForPercent(startPoint)
      const [ endX, endY ] = this.getCoordinatesForPercent(startPoint + slice.percent)

      // When a slice is more than 50%, the large arc point should be 1
      const isLargeArc = slice.percent > 0.5 ? 1 : 0

      // pathData - create an array and join it just for code readability
      return [
        `M ${startX} ${startY}`, // Move starting point
        `A 1 1 0 ${isLargeArc} 1 ${endX} ${endY}`, // draw an Arc
        `L 0 0`, // and draw a Line to this point
        `Z` // cloZe the path back to first point - needed to have a stroke
      ].join(' ')
    },
    getStartPercent (index) {
      // Each slice starts where the previous slice ended,
      // so we need to know the total percent so far
      return this.slices.slice(0, index).reduce((acc, cur) => acc + cur.percent, 0)
    },
    getCoordinatesForPercent (percent) {
      return [
        Math.cos(2 * Math.PI * percent), // x coordinate
        Math.sin(2 * Math.PI * percent) // y coordinate
      ]
    }
  }
}
</script>
