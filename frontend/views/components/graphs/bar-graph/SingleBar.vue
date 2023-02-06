<template lang='pug'>
.bar-graph(
  @mouseenter='ephemeral.tooltipVisible = true'
  @mouseleave='ephemeral.tooltipVisible = false'
  @click='toggleTooltip'
)
  .bar-graph-column(:class='`has-background-${getResult(data.total)}`')
    .bar-graph-progress(
      :style='{height: getPercentage(data.total), width: getPercentage(data.total)}'
      :class='[{ isLow: isLow(data.total) }, `has-background-${getResult(data.total)}-solid`]'
    )
      .bar-graph-content
        h4.bar-graph-title {{ data.title }}
        p.bar-graph-txt {{ data.total | toPercent }}%

    .c-bar-tooltip.hide-phone(v-if='data.tooltipContent && ephemeral.tooltipVisible')
      .c-tooltip-content(v-for='(content, index) in data.tooltipContent') {{ content }}
</template>

<script>
import { toPercent } from '@view-utils/filters.js'

export default ({
  name: 'SingleBar',
  props: {
    data: {
      type: Object, // { total: number, title: string, tooltipContent: Array<string> }
      required: true
    }
  },
  data () {
    return {
      ephemeral: {
        tooltipVisible: false
      }
    }
  },
  methods: {
    getPercentage (percentage) {
      return percentage >= 1 ? '100%' : `${Math.floor(percentage * 100)}%`
    },
    getResult (percentage) {
      if (percentage < 0.6) return 'danger'
      if (percentage < 1) return 'warning'
      return 'success'
    },
    isLow (percentage) {
      return percentage <= 0.35
    },
    toggleTooltip () {
      this.ephemeral.tooltipVisible = !this.ephemeral.tooltipVisible
    }
  },
  filters: {
    toPercent
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.bar-graph {
  width: 100%;

  @include tablet {
    max-width: 7.5rem;
  }

  &-column {
    position: relative;
    width: 100%;
    display: inline-block;
    min-height: 12.5rem;
    color: $background_0;
    text-align: center;
    font-size: $size_1;
    line-height: 1.2;

    @include phone {
      display: block;
      min-height: 2.5rem;
    }

    &:first-child {
      border-left: 0;
    }

    &:last-child {
      border-right: 0;
    }

    &::before {
      position: absolute;
      top: 0;
      left: 0;
      content: "";
      width: 100%;
      height: 100%;
      opacity: 0.5;
      background-color: $background_0;
    }
  }

  &-content {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;

    @include phone {
      align-items: flex-end;
      text-align: right;
      top: 50%;
      left: unset;
      right: 0.5rem;
      transform: translateY(-50%);
    }
  }

  &-title,
  &-txt {
    position: relative;
    font-size: 0.875rem;
    color: $white;
    z-index: 2;
    transition: opacity 0.7s ease-out;
  }

  &-title {
    font-weight: 600;

    @include from($tablet) {
      padding: 0.5rem 0.3rem 0.2rem 0.3rem;
    }

    @include phone {
      width: max-content;
    }
  }

  &-progress {
    transition: width 0.7s ease-out, height 0.7s ease-out;
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    left: 0;
    bottom: 0;
    width: 100%;

    @include from($tablet) {
      width: 100% !important;
    }

    @include phone {
      height: 100% !important;
    }
  }
}

.isLow {
  .bar-graph-content {
    top: -0.5rem;
    transform: translate(-50%, -100%);

    @include phone {
      align-items: flex-start;
      text-align: left;
      top: 50%;
      right: -0.5rem;
      transform: translate(100%, -50%);
    }
  }

  .bar-graph-title,
  .bar-graph-txt {
    color: var(--danger_0);
  }
}

.c-bar-tooltip {
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  min-width: 10rem;
  max-width: 16rem;
  width: max-content;
  border-radius: $radius;
  padding: 0.5rem;
  z-index: $zindex-tooltip;
  pointer-events: none;
  background-color: $text_0;
  opacity: 0.95;
  color: $background_0;
  text-align: center;
  font-size: $size_4;
}
</style>
