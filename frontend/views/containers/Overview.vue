<template lang='pug'>
div
  p.has-text-1 Group members and their pledges
  .c-chart
    .c-chart-legends
      .c-legend
        span.square.has-background-warning-solid
        i18n Total needed
        b {{ totalNeeded }}

      .c-legend
        span.square.has-background-primary-solid
        i18n Total pledged
        b {{ totalPledge }}

      .c-legend(v-if='positiveBalance')
        span.square.has-background-success-solid
        i18n Surplus
        b {{ surplus }}

      .c-legend(v-else)
        span.square.has-background-danger-solid
        i18n Needed
        b {{ surplus }}

    .c-chart-wrapper
      svg(
        width='100%'
        :viewBox='`0 0 ${ratioX} ${ratioY + verticalPadding}`'
        preserveAspectRatio='xMidYMid meet'
        aria-labelledby='title'
        role='img'
      )
        g(:transform='`translate(0,${middle})`')
          g.g-animate(:style='`transform: scale3d(1,${ ready ? 1 : 0 },1)`')
            g.bars(
              v-for='(member, index) in members.list'
              :transform='positionX(index)'
            )
              path(
                :class='color(member.delta, false)'
                :d='roundedRect(member.delta >= 0, 0, positionY(member.delta), width, height(member.delta), 3)'
              )

              path.g-animate-opacity.g-animate-delay(
                v-if='hasSurplus(member.delta)'
                :class='color(member.delta, true)'
                :d='surplusRectangle(member.delta)'
                :style='`opacity: ${ ready ? 1 : 0 }`'
              )

          g.line
            line(x1='0' y1='0' :x2='ratioX' y2='0' stroke='#dbdbdb' stroke-width='1')
            foreignObject(:x='ratioX - 25' :y='-labelPadding' width='25' height='18')
              .tag.mincome {{ base }}

          g.line(
            :transform='`translate(0, ${-surplusPosition})`'
          )
            line.g-animate.g-animate-delay(
              :style='`transform: scale3d(${ ready ? 1 : 0 },1,1)`'
              x1='0'
              y1='0'
              :x2='ratioX'
              y2='0'
              stroke='#dbdbdb'
              stroke-width='1'
              stroke-dasharray='1'
            )
            foreignObject(
              :x='ratioX - mincome.length * 10'
              :y='-labelPadding'
              :width='mincome.length * 10'
              height='18'
              :transform='`translate(0,${surplusLabelPosition})`'
            )
              .tag.g-animate-opacity.g-animate-delay(
                :style='`opacity: ${ ready ? 1 : 0 }`'
              ) {{ mincome }}
</template>

<script>
import { debounce } from '@utils/giLodash.js'
import { mapGetters } from 'vuex'
import currencies from '@view-utils/currencies.js'
import { TABLET } from '@view-utils/breakpoints.js'

export default {
  name: 'Overview',
  data: () => ({
    ephemeral: {
      labelActiveIndex: 0,
      labelStyle: {},
      isLabelVisible: false
    },
    ratioWidthPadding: 1.2,
    ratioX: 526,
    ratioY: 163,
    verticalPadding: 22,
    labelPadding: 11,
    maxWidth: 48,
    ready: false,
    isMobile: false
  }),
  mounted () {
    window.addEventListener('resize', this.handleResize)
    setTimeout(() => { this.ready = true }, 0)
  },
  beforeDestroy: function () {
    window.removeEventListener('resize', this.handleResize)
  },
  computed: {
    ...mapGetters([
      'groupProfiles',
      'groupSettings'
    ]),
    currency () {
      return currencies[this.groupSettings.mincomeCurrency]
    },
    membersNumber () {
      return this.members.list.length
    },
    width () {
      return Math.min(this.ratioX / this.membersNumber / this.ratioWidthPadding, this.maxWidth)
    },
    middle () {
      return this.calculRatioY(this.max) + this.verticalPadding / 2
    },
    max () {
      return Math.max.apply(Math, this.members.list.map((m) => { return m.delta }))
    },
    min () {
      return Math.min.apply(Math, this.members.list.map((m) => { return m.delta }))
    },
    surplusPosition () {
      // Find who by the surplus or need position
      const surplusMembers = this.members.list.reduce((filtered, member) => {
        if (this.positiveBalance === (member.delta > 0)) filtered.push(Math.abs(member.delta))
        return filtered
      }, []).sort((a, b) => a - b)

      // Surplus or Needed Position
      let position = 0
      // Either total Needed or total pledge is used to calcul the surplus position
      let used = Math.min(this.members.totalNeeded, this.members.totalPledge)
      // Loop only on members that overlay the surplus position
      surplusMembers.forEach((delta, index) => {
        // Get all the people that are not already completlety included in the surplus
        const nb = surplusMembers.length - index
        const all = nb * delta
        if (used > 0) {
          // console.log(`Loop ${index}: delta ${delta}, nb right:${nb}, all: ${all} , used:${used}, position: ${position}`)
          if (all > used) {
            position += used / nb
            used = 0
            // console.log(`all > used and position: ${position}`)
          } else {
            used -= all
            position += delta
            // console.log(`all < used and used: ${used}, position: ${position}`)
          }
        }
      })

      return this.calculRatioY(this.positiveBalance ? position : -position)
    },
    members () {
      const list = []
      let totalPledge = 0
      let totalNeeded = 0
      Object.values(this.groupProfiles).forEach(member => {
        if (member.incomeDetailsType === 'incomeAmount' && member.incomeAmount) {
          list.push({ delta: -member.incomeAmount })
          totalNeeded += member.incomeAmount
        } else if (member.pledgeAmount) {
          list.push({ delta: member.pledgeAmount })
          totalPledge += member.pledgeAmount
        }
      })
      list.sort((a, b) => (a.delta > b.delta) ? 1 : (a.delta === b.delta) ? ((a.delta > b.delta) ? 1 : -1) : -1)
      return { list, totalPledge, totalNeeded }
    },
    mincome () {
      return this.currency.displayWithCurrency(this.groupSettings.mincomeAmount)
    },
    totalNeeded () {
      return this.currency.displayWithCurrency(this.members.totalNeeded)
    },
    totalPledge () {
      return this.currency.displayWithCurrency(this.members.totalPledge)
    },
    surplus () {
      return this.currency.displayWithCurrency(Math.abs(this.members.totalPledge - this.members.totalNeeded))
    },
    positiveBalance () {
      return this.members.totalPledge - this.members.totalNeeded >= 0
    },
    base () {
      return this.currency.displayWithCurrency(0)
    },
    surplusLabelPosition () {
      // Add padding if surplus label is to close to 0 line
      if (Math.abs(this.surplusPosition) < this.labelPadding * 2) {
        return this.positiveBalance ? -this.labelPadding : this.labelPadding
      } else return 0
    }
  },
  methods: {
    handleResize: debounce(function () {
      this.isMobile = this.verifyIsMobile()
      this.ratioX = this.isMobile ? 310 : 526
    }, 100),
    verifyIsMobile () {
      return window.innerWidth < TABLET
    },
    calculRatioY (y) {
      return this.ratioY / (this.max + Math.abs(this.min)) * y
    },
    height (delta) {
      return this.calculRatioY(Math.abs(delta))
    },
    positionX (index) {
      const marginLeft = Math.max((this.width * this.ratioWidthPadding - this.width) / 2, 28)
      let maxWidth = this.membersNumber * (this.width + marginLeft)
      if (this.isMobile) maxWidth -= 50
      const positionX = maxWidth / this.membersNumber * index
      const offset = this.isMobile ? -marginLeft : (this.ratioX - maxWidth) / 2 - marginLeft
      return `translate(${positionX + marginLeft + offset}, 0)`
    },
    positionY (delta) {
      // If delta is positive, the bar start at 0 otherw
      return delta >= 0 ? -(this.calculRatioY(delta)) : 0
    },
    color (delta, surplus) {
      if (delta >= 0) return surplus ? 'g-surplus' : 'g-positive'
      else return surplus ? 'g-needed' : 'g-negative'
    },
    hasSurplus (delta) {
      return this.height(delta) > Math.abs(this.surplusPosition) && (this.positiveBalance === (delta > 0))
    },
    surplusRectangle (delta) {
      let positionY = this.positionY(delta)
      if (!this.positiveBalance) positionY -= this.surplusPosition
      return this.roundedRect(this.positiveBalance, 0, positionY, this.width, this.height(delta) - Math.abs(this.surplusPosition), 3)
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
  font-size: 12px;
  background-color: #fff;
  color: var(--text_1);
  text-align: right;
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
  margin-right: 40px;

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
  b {
    margin-left: 7px;
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
</style>
