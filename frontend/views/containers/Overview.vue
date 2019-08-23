<template lang="pug">
div
  p.has-text-1 Group members and their pledges
  //- input(type="text" v-model='ratioWidthPadding')
  .c-chart-wrapper
    svg.c-chart(
      width='100%'
      :viewBox='`0 0 526 ${ratioY}`'
      preserveAspectRatio='xMidYMid meet'
      aria-labelledby='title'
      role='img'
    )
      g.bars(
        v-for='(member, index) in fakeData.members'
        :transform='position(index)'
      )
        rect(
          :width='width'
          :height='height(member.delta)'
          :y='positionY(member.delta)'
          :fill='color(member.delta)'
        )

        rect(
          v-if='member.delta >= 0 && (ratioY / 2 - height(member.delta)) < surplusPosition'
          :width='width'
          :height='surplusPosition'
          :y='positionY(member.delta)'
          fill='#A0D10E'
        )

      g.line(:transform='`translate(0,${ratioY/2})`')
        line(x1='0' y1='0' :x2='maxGraphWidth' y2='0' stroke='#dbdbdb' stroke-width='1')
        foreignObject(x="469" y="-9" width="57" height="18")
          .tag.mincome Mincome

      g.line(:transform='`translate(0,${surplusPosition})`')
        line(x1='0' y1='0' :x2='maxGraphWidth' y2='0' stroke='#dbdbdb' stroke-width='1' stroke-dasharray='1')
        foreignObject(x="469" y="-9" width="50" height="18")
          .tag Surplus

    .c-chart-info
      i18n.label(tag='label') Total amount needed
        .c-total-amount $750

      label.label
        i18n Total pledged
        .c-total-pledge $800

      label.label
        i18n Surplus
        .c-surplus $50

      i18n.help(tag='p') This amount will not be used
</template>

<script>
import { debounce } from '@utils/giLodash.js'

export default {
  name: 'Overview',
  props: {
    // Todo: replace data
  },
  data: () => ({
    ephemeral: {
      labelActiveIndex: 0,
      labelStyle: {},
      isLabelVisible: false
    },
    ratioWidthPadding: 1.9,
    ratioX: 526,
    ratioY: 163,
    maxGraphWidth: 465,
    fakeData: { // Todo with real data: transform user pledge to delta using mincome
      members: [
        {
          delta: '-81'
        },
        {
          delta: '-36'
        },
        {
          delta: '-27'
        },
        {
          delta: '22'
        },
        {
          delta: '67'
        },
        {
          delta: '80'
        }
      ]
    }
  }),
  computed: {
    membersNumber () {
      return this.fakeData.members.length
    },
    width () {
      return this.maxGraphWidth / this.membersNumber / this.ratioWidthPadding
    },
    max () {
      return Math.max.apply(Math, this.fakeData.members.map((m) => { return m.delta }))
    },
    surplusPosition () {
      const m = this.fakeData.members
      const total = m.map(member => member.delta).reduce((prev, next) => parseInt(prev) + parseInt(next))
      return this.ratioY / this.max * total / this.membersNumber
    }
  },
  methods: {
    height (delta) {
      return this.ratioY / this.max * Math.abs(delta) / 2
    },
    position (index) {
      const marginLeft = (this.width * this.ratioWidthPadding - this.width) / 2
      const centerY = this.ratioY / 2
      const positionX = this.maxGraphWidth / this.membersNumber * index
      return `translate(${positionX + marginLeft}, ${centerY})`
    },
    positionY (delta) {
      return delta >= 0 ? -(this.ratioY / this.max * delta / 2) : 0
    },
    color (delta) {
      return delta >= 0 ? 'rgba(93,200,240,1)' : 'rgba(248,146,1,0.7)'
    },
    showLabel: debounce(function (e, index) {
      this.ephemeral.labelActiveIndex = index
      this.ephemeral.labelStyle = { position: 'fixed', top: `${e.clientY}px`, left: `${e.clientX}px` }
      this.ephemeral.isLabelVisible = true
    }, 100),
    hideLabel (event) {
      this.ephemeral.isLabelVisible = false
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-chart-wrapper {
  display: flex;
  flex-wrap: wrap;
}

.c-chart {
  width: 526px;
  max-width: 100%;

  @include tablet {
    margin-right: 27px;
  }
}

.c-chart-info {
  width: 176px;
  margin-top: 24px;
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
  background-color: $general_0;
  border-radius: 3px;
  text-align: center;
  display: flex;
  height: 18px;
  justify-content: center;
  align-items: center;
  margin-left: 4px;
  line-height: 0;
  color: $text_1;

  &::before {
    content: '';
    width: 4px;
    height: 4px;
    transform: rotate(45deg);
    background-color: $general_0;
    position: absolute;
    left: 2px;
  }

  &.mincome {
    background-color: $text_1;
    color: #fff;

    &::before {
      background-color: $text_1;
    }
  }
}
</style>
