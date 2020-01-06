<template lang='pug'>
div
  i18n.has-text-1(tag='p') Group members and their pledges
  .c-chart
    .c-chart-legends
      .c-legend
        span.square.has-background-warning-solid
        i18n(:args='{ ...LTags("b"), formatTotalNeeded }') Total needed {b_}{formatTotalNeeded}{_b}

      .c-legend
        span.square.has-background-primary-solid
        i18n(:args='{ ...LTags("b"), formatTotalPledge }') Total contribution {b_}{formatTotalPledge}{_b}

      .c-legend(v-if='positiveBalance')
        span.square.has-background-success-solid
        i18n(:args='{ ...LTags("b"), formatSurplus }') Surplus {b_}{formatSurplus}{_b}

      .c-legend(v-else)
        span.square.has-background-danger-solid
        i18n(:args='{ ...LTags("b"), formatSurplus }') Needed {b_}{formatSurplus}{_b}

    .c-chart-wrapper
      svg(
        width='100%'
        :viewBox='`0 0 ${ratioX} ${ratioY}`'
        preserveAspectRatio='xMidYMid meet'
        aria-labelledby='title'
        role='img'
        ref='graph'
      )
        // Move graph origin to the middle
        g(:transform='`translate(0,${middle})`')
          // Animate using scale from the middle
          g.g-animate(:style='`transform: scale3d(1,${ ready ? 1 : 0 },1)`')
            g(
              v-for='(member, index) in members'
              :transform='positionX(index)'
            )
              // Total needed or total pledge bars
              path(
                v-for='(values, index) in [member.total, member.amount]'
                :class='color(values, index)'
                :d='roundedRect(values >= 0, 0, positionY(values), width, height(values), width > 15 ? 3 : 1)'
              )

          // Base with $0 on top of bars
          line(x1='0' y1='0' :x2='ratioX' y2='0' stroke='#dbdbdb' stroke-width='1')

          // Surplus line on top of bars
          g(
            v-for='scaleLine in createScale'
            :transform='`translate(0,${-scaleLine.position})`'
          )
            line.g-animate.g-animate-delay(
              :style='`transform: scale3d(${ready ? 1 : 0},1,1)`'
              x1='0'
              y1='0'
              :x2='ratioX'
              y2='0'
              stroke='#dbdbdb'
              stroke-width='1'
              stroke-dasharray='1'
            )

      .tag.mincome(:style='middleTag') {{ base }}
      .tag.g-animate-opacity.g-animate-delay(
        v-for='scaleLine in createScale'
        :style='{ opacity: ready ? 1 : 0, transform: "translate(0," + (-scaleLine.position + middle - labelPadding) + "px)" }'
      ) {{ scaleLine.label }}
</template>

<script>
import { debounce } from '@utils/giLodash.js'
import { mapGetters } from 'vuex'
import currencies from '@view-utils/currencies.js'
import { TABLET } from '@view-utils/breakpoints.js'

export default {
  name: 'Overview',
  data: () => ({
    ratioWidthPadding: 1.5,
    ratioX: 526,
    ratioY: 163,
    labelPadding: 10,
    labelwidth: 52,
    availableWidth: 474,
    maxWidth: 48,
    ready: false,
    isMobile: false
  }),
  mounted () {
    window.addEventListener('resize', this.handleResize)
    this.handleResize()
    setTimeout(() => { this.ready = true }, 0)

    // TODO remove after tests
    // this.toPrecision(0.0000002234234)
    // this.toPrecision(0.34)
    // this.toPrecision(0.00334)
    // this.toPrecision(234)
    // this.toPrecision(4234)
    // this.toPrecision(3234234)
  },
  beforeDestroy: function () {
    window.removeEventListener('resize', this.handleResize)
  },
  computed: {
    ...mapGetters([
      'groupProfiles',
      'groupSettings',
      'groupIncomeDistribution',
      'thisMonthsPayments'
    ]),
    distribution () {
      return this.thisMonthsPayments.frozenDistribution || this.groupIncomeDistribution
    },
    // Extract members incomes
    members () {
      // Create object that contain what people need / pledge and what people receive / give
      let list = {}
      this.groupIncomeDistribution.map(distribution => {
        list = this.addToList(list, distribution.from, distribution.amount)
        list = this.addToList(list, distribution.to, -distribution.amount)
      })
      // Sort object by need / pledge
      list = Object.values(list).sort((a, b) => a.total - b.total)
      return list
    },
    totals () {
      return this.members.map(a => a.total)
    },
    amounts () {
      return this.members.map(a => a.amount)
    },
    totalNeeded () {
      return this.totals.length > 0
        ? Math.abs(this.totals.filter(total => total < 0).reduce((total, amount) => total + amount))
        : 0
    },
    totalPledge () {
      return this.amounts.length > 0
        ? this.amounts.filter(member => member > 0).reduce((total, amount) => total + amount)
        : 0
    },
    totalSurplus () {
      return this.totals.length > 0
        ? this.totals.filter(member => member > 0).reduce((total, amount) => total + amount) - this.totalNeeded
        : 0
    },
    membersNumber () {
      return this.members.length
    },
    mincome () {
      return this.groupSettings.mincomeAmount
    },
    // Formated Legends
    currency () {
      return currencies[this.groupSettings.mincomeCurrency].displayWithCurrency
    },
    formatTotalNeeded () {
      return this.currency(this.totalNeeded)
    },
    formatTotalPledge () {
      return this.currency(this.totalPledge)
    },
    formatSurplus () {
      return this.currency(Math.abs(this.totalSurplus - this.totalNeeded))
    },
    base () {
      return this.currency(0)
    },
    positiveBalance () {
      return this.totalPledge - this.totalNeeded >= 0
    },
    // Graphic proportions
    width () {
      return Math.min(this.availableWidth / this.membersNumber / this.ratioWidthPadding, this.maxWidth)
    },
    max () {
      return Math.max.apply(Math, this.totals)
    },
    min () {
      return Math.min.apply(Math, this.totals)
    },
    middle () {
      return this.calculRatioY(this.max)
    },
    middleTag () {
      return { transform: 'translate(0,' + (this.middle - this.labelPadding) + 'px)' }
    },
    createScale () {
      const range = this.max - this.min
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
        this.availableWidth = this.ratioX - this.labelwidth
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
    addToList (list, id, amount) {
      const existingUser = list[id]
      // Test if user already in the list
      if (typeof existingUser !== 'undefined') {
        list[id].amount = existingUser.amount + amount
      } else {
        // Add new user to the list
        list[id] = {
          amount: amount,
          total: amount > 0
            ? this.groupProfiles[id].pledgeAmount
            : this.groupProfiles[id].incomeAmount - this.mincome
        }
      }
      return list
    },
    calculRatioY (y) {
      return this.ratioY / (this.max + Math.abs(this.min)) * y
    },
    height (delta) {
      return this.calculRatioY(Math.abs(delta))
    },
    positionX (index) {
      const marginLeft = Math.min((this.availableWidth - (this.width * this.membersNumber)) / this.membersNumber, 28)
      const maxWidth = this.membersNumber * (this.width + marginLeft)
      const positionX = maxWidth / this.membersNumber * index
      const offset = this.isMobile ? -marginLeft : (this.availableWidth - maxWidth) / 2 - marginLeft
      return `translate(${positionX + marginLeft + offset}, 0)`
    },
    positionY (delta) {
      // If delta is positive, the bar start at 0 otherw
      return delta >= 0 ? -(this.calculRatioY(delta)) : 0
    },
    color (delta, surplus) {
      if (delta >= 0) return surplus ? 'g-positive' : 'g-surplus'
      else return surplus ? 'g-negative' : 'g-needed'
    },
    roundedRect (up, x, y, w, h, r) {
      let retval = 'M' + (x + r) + ',' + y
      retval += 'h' + (w - 2 * r)
      // Top right corner
      if (up) retval += 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r // Arc
      else {
        // Square corner
        retval += 'h' + r
        retval += 'v' + r
      }
      retval += 'v' + (h - 2 * r)
      // Bottom right corner
      if (up) {
        // Square corner
        retval += 'v' + r
        retval += 'h' + -r
      } else retval += 'a' + r + ',' + r + ' 0 0 1 ' + -r + ',' + r // Arc
      retval += 'h' + (2 * r - w)
      // Bottom left corner
      if (up) {
        // Square corner
        retval += 'h' + -r
        retval += 'v' + -r
      } else retval += 'a' + r + ',' + r + ' 0 0 1 ' + -r + ',' + -r // Arc
      retval += 'v' + (2 * r - h)
      // Top left corner
      if (up) retval += 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + -r // Arc
      else {
        // Square corner
        retval += 'v' + -r
        retval += 'h' + r
      }
      retval += 'z'
      return retval
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-chart {
  @include phone {
    display: flex;
    flex-direction: column-reverse;
  }
}

.c-chart-wrapper {
  display: flex;
  flex-wrap: wrap;
  position: relative;
}

.c-total-amount {
  color: $warning_0;
}

.c-total-pledge {
  color: $primary_0;
}

.c-surplus {
  color: $success_0;
}

.tag {
  position: absolute;
  right: 0;
  font-size: 12px;
  background-color: #fff;
  color: var(--text_1);
  text-align: right;
  padding-left: 10px;
}

.c-chart-legends {
  display: flex;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;

  @include phone {
    display: flex;
    flex-direction: column;
  }
}

.c-legend {
  color: $text_1;
  margin-right: 40px;

  &:last-child {
    margin-right: 0;
  }

  @include phone {
    margin-right: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .square {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 10px;
    border-radius: 1px;

    @include phone {
      position: absolute;
      right: 7px;
      margin-top: 1px;
    }
  }

  ::v-deep b {
    font-family: "Poppins";
    margin-left: 7px;
    color: $text_0;
  }
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
  fill: $danger_0;
}

// TODO remove once merge with Sandrina
.has-background-primary-solid {
  background-color: $primary_0;
}

.has-background-success-solid {
  background-color: $success_0;
}

.has-background-warning-solid {
  background-color: $warning_0;
}

.has-background-danger-solid {
  background-color: $danger_0;
}

.g-animate {
  // TODO: remove important once test are done
  transition: transform 0.7s ease-out !important;
}

.g-animate-opacity {
  // TODO: remove important once test are done
  transition: opacity 0.7s ease-out !important;
}

.g-animate-delay {
  // TODO: remove important once test are done
  transition-delay: 0.5s !important;
}

.c-no-activities {
  display: flex;
}
</style>
