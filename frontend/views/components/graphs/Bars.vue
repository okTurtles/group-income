<template lang='pug'>
.c-chart-wrapper
  svg(
    width='100%'
    :viewBox='`0 0 ${ratioX} ${ratioY}`'
    preserveAspectRatio='xMidYMid meet'
    aria-labelledby='title'
    role='img'
    ref='graph'
    @mouseleave='hideLabel()'
  )
    // Move graph origin to the middle
    g(:transform='`translate(0,${middle})`')
      // Animate using scale from the middle
      g.g-animate(:style='`transform: scale3d(1,${ isReady ? 1 : 0 },1)`')
        // Surplus line on top of bars
        g(
          v-for='scaleLine in createScale'
          :transform='`translate(0,${-scaleLine.position})`'
        )
          line.g-animate.g-animate-delay(
            :style='`transform: scale3d(${isReady ? 1 : 0},1,1)`'
            x1='0'
            y1='0'
            :x2='ratioX'
            y2='0'
            stroke='#dbdbdb'
            stroke-width='1'
            stroke-dasharray='1'
          )

        g.graph-bar(
          v-for='(member, index) in members'
          :transform='positionX(index)'
          @mouseover='showLabel(index, member)'
          @mouseleave='showLabel(index)'
        )
          // Total needed or total pledge bars
          path(
            v-for='(values, index) in [member.total, member.amount]'
            :class='color(values, index)'
            :d='roundedRect(values >= 0, index === 1 && member.total !== Math.round(member.amount), 0, positionY(values), width, height(values), width > 15 ? 3 : 1)'
          )

      // Base with $0 on top of bars
      line(x1='0' y1='0' :x2='ratioX' y2='0' stroke='#dbdbdb' stroke-width='1')

  .c-tag-user(
    :class='{ positive: barTotal >= 0 }'
    :style='{ opacity: barTotal || barAmount ? 1 : 0, transform: `translate3d(${labelX}px,${labelY}px,0)`} '
  )
    .c-tag-total(v-if='Math.round(barTotal) !== 0') {{currency(Math.abs(Math.round(barTotal)))}}
    .c-tag-amount(v-if='barAmount !== 0 && Math.round(barAmount) !== Math.round(barTotal)') {{currency(Math.abs(Math.round(barAmount)))}}

  .c-tag.mincome(:style='middleTag') {{ base }}
  .c-tag.g-animate-opacity.g-animate-delay(
    v-for='scaleLine in createScale'
    :style='{ opacity: isReady ? 1 : 0, transform: "translate(0," + (-scaleLine.position + middle - labelPadding) + "px)" }'
  ) {{ scaleLine.label }}
</template>

<script>
import { mapGetters } from 'vuex'
import { debounce } from '@utils/giLodash.js'
import { TABLET } from '@view-utils/breakpoints.js'
import currencies from '@view-utils/currencies.js'

export default ({
  name: 'Bars',
  props: {
    totals: Array,
    members: Array
  },
  data: () => ({
    ratioWidthPadding: 1.5,
    ratioX: 720,
    ratioY: 160,
    labelPadding: 10,
    maxWidth: 48,
    isReady: false,
    isMobile: false,
    barTotal: 0,
    barAmount: 0,
    labelX: 0,
    labelY: 0
  }),
  mounted () {
    window.addEventListener('resize', this.handleResize)
    this.handleResize()
    setTimeout(() => { this.isReady = true }, 0)
  },
  beforeDestroy: function () {
    window.removeEventListener('resize', this.handleResize)
  },
  computed: {
    ...mapGetters([
      'groupProfiles',
      'groupSettings'
    ]),
    base () {
      return this.currency(0)
    },
    currency () {
      return currencies[this.groupSettings.mincomeCurrency].displayWithCurrency
    },
    membersNumber () {
      return this.members.length
    },
    // Graphic proportions
    width () {
      return Math.min(this.availableWidth / this.membersNumber / this.ratioWidthPadding, this.maxWidth)
    },
    availableWidth () {
      return this.ratioX - this.labelWidth
    },
    labelWidth () {
      return this.max.toString().length * 9
    },
    max () {
      const max = Math.max.apply(Math, this.totals)
      return max > 0 ? Math.max.apply(Math, this.totals) : 0
    },
    min () {
      const min = Math.min.apply(Math, this.totals)
      return min > 0 ? 0 : min
    },
    middle () {
      return this.max > 0 ? this.calculRatioY(this.max) : 0
    },
    middleTag () {
      return { transform: 'translate(0,' + (this.middle - this.labelPadding) + 'px)' }
    },
    createScale () {
      const range = this.max + Math.abs(this.min)
      const maxScalesCount = 4
      const roundedTickRange = this.toPrecision(range / maxScalesCount)
      const scales = []
      let scale = Math.ceil(this.min / roundedTickRange) * roundedTickRange
      while (scale <= this.max) {
        let label = this.currency(Math.abs(scale))
        if (scale < 0) label = '-' + label
        // Add scale label and positition
        scales.push({ label: label, position: this.calculRatioY(scale) })
        scale = scale + roundedTickRange
      }
      return scales
    }
  },
  methods: {
    handleResize: debounce(function () {
      if (this.$refs.graph) {
        this.isMobile = this.verifyIsMobile()
        this.ratioX = this.$refs.graph.clientWidth
      }
    }, 100),

    toPrecision (nbr) {
      if (typeof nbr !== 'number') return 0
      if (nbr === 0) return 0
      // log only for positive number
      const num = Math.abs(nbr)
      // Remove floating number for large number to calcul the precision
      if (nbr > 10) nbr = parseInt(nbr)
      // Increase precision for small value
      const precision = nbr.toString().length > 3 ? 2 : 1
      // Rounding technic
      const digits = Math.ceil(Math.log(num) / Math.LN10)
      const factor = Math.pow(10, precision - digits)
      let result = Math.round(num * factor, 0) / factor
      // Remove floating number for large number
      if (num > 1000) result = parseInt(result)
      // Bring sign back
      return nbr > 0 ? result : -result
    },

    verifyIsMobile () {
      return window.innerWidth < TABLET
    },

    calculRatioY (y) {
      return (y !== 0) ? this.ratioY / (this.max + Math.abs(this.min)) * y : 0
    },

    height (delta) {
      return (delta !== 0) ? this.calculRatioY(Math.abs(delta)) : 0
    },

    calculPositionX (index) {
      const marginLeft = Math.min((this.availableWidth - (this.width * this.membersNumber)) / this.membersNumber, 28)
      const maxWidth = this.membersNumber * (this.width + marginLeft)
      const positionX = maxWidth / this.membersNumber * index
      const offset = (this.availableWidth - maxWidth) / 2 - marginLeft
      return positionX + marginLeft + offset
    },

    positionX (index) {
      return `translate(${this.calculPositionX(index)}, 0)`
    },

    positionY (delta) {
      // If delta is positive, the bar start at 0 otherwise we start at the top of the bar
      return delta > 0 ? -(this.calculRatioY(delta)) : 0
    },

    color (delta, surplus) {
      if (delta >= 0) return surplus ? 'g-positive' : 'g-surplus'
      else return surplus ? 'g-negative' : 'g-needed'
    },

    roundedRect (up, squared, x, y, w, h, r) {
      let retval = 'M' + (x + r) + ',' + y
      retval += 'h' + (w - 2 * r)
      // Top right corner
      if (up && !squared) retval += 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r // Arc
      else {
        // Square corner
        retval += 'h' + r
        retval += 'v' + r
      }
      retval += 'v' + (h - 2 * r)
      // Bottom right corner
      if (up || squared) {
        // Square corner
        retval += 'v' + r
        retval += 'h' + -r
      } else retval += 'a' + r + ',' + r + ' 0 0 1 ' + -r + ',' + r // Arc
      retval += 'h' + (2 * r - w)
      // Bottom left corner
      if (up || squared) {
        // Square corner
        retval += 'h' + -r
        retval += 'v' + -r
      } else retval += 'a' + r + ',' + r + ' 0 0 1 ' + -r + ',' + -r // Arc
      retval += 'v' + (2 * r - h)
      // Top left corner
      if (up && !squared) retval += 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + -r // Arc
      else {
        // Square corner
        retval += 'v' + -r
        retval += 'h' + r
      }
      retval += 'z'
      return retval
    },

    hideLabel () {
      this.barTotal = 0
      this.barAmount = 0
    },

    showLabel (index, member) {
      this.labelX = this.calculPositionX(index) + this.width / 2
      if (member) {
        this.labelY = member.total > 0 ? this.positionY(member.amount) + this.middle : this.height(member.amount) + this.middle
        this.barTotal = member.total - member.amount
        this.barAmount = member.amount
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-chart-wrapper {
  display: flex;
  flex-wrap: wrap;
  position: relative;
  min-height: 160px;
}

.c-tag {
  position: absolute;
  right: 0;
  font-size: $size_5;
  min-width: 1.875rem;
  background-color: $background_0;
  color: $text_1;
  text-align: right;
  padding-left: 0.125rem;
}

.c-tag-user {
  width: 3.75rem;
  position: absolute;
  z-index: 2;
  top: -1.5rem;
  left: -1.875rem;
  pointer-events: none;
  border-radius: 3px;
  text-align: center;
  color: $danger_3;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  transition: opacity 0.2s ease-in 0.2s, transform 0.2s ease-out;

  .c-tag-amount {
    color: $warning_0;
    margin-bottom: 0.375rem;
  }

  .c-tag-amount,
  .c-tag-total {
    border-radius: 3px;
    background: rgba(256, 256, 256, 0.4);
    padding: 0 0.125rem;
  }

  &.positive {
    flex-direction: column;

    .c-tag-amount {
      color: $primary_0;
      margin-bottom: 0;
    }

    .c-tag-total {
      color: $success_0;
      margin-bottom: 0.375rem;
    }

    .c-tag-total:last-child {
      margin-top: 1.625rem;
    }
  }
}

.c-no-activities {
  display: flex;
}

.g-surplus {
  fill: $success_0;
}

.g-positive {
  fill: $primary_0;
}

.g-negative {
  fill: $warning_0;
}

.g-needed {
  fill: $danger_3;
}

.g-animate {
  transition: transform 0.7s ease-out;
}

.g-animate-opacity {
  transition: opacity 0.7s ease-out;
}

.g-animate-delay {
  transition-delay: 0.5s;
}
</style>
