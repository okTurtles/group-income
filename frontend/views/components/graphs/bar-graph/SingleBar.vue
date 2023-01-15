<template lang='pug'>
.bar-graph
  .bar-graph-column(:class='`has-background-${getResult(data.total)}`')
    .bar-graph-progress(
      :style='{height: getPercentage(data.total), width: getPercentage(data.total)}'
      :class='[{ isLow: isLow(data.total) }, `has-background-${getResult(data.total)}-solid`]'
    )
      h4.bar-graph-title {{ data.title }}
      p.bar-graph-txt {{ data.total | toPercent }}%
</template>

<script>
import { toPercent } from '@view-utils/filters.js'

export default ({
  name: 'SingleBar',
  props: {
    data: {
      type: Object, // { total: number, title: string }
      required: true
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
      return percentage <= 0.2
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

  &-title,
  &-txt {
    position: relative;
    font-size: 0.875rem;
    color: $white;
    z-index: 2;
    transition: opacity 0.7s ease-out;

    @include phone {
      position: absolute;
      right: 0.625rem;
      top: 50%;
    }
  }

  &-title {
    font-weight: 600;

    @include from($tablet) {
      padding: 0.5rem 0.3rem 0.2rem 0.3rem;
    }

    @include phone {
      top: 10%;
      width: max-content;
    }
  }

  &-progress {
    transition: width 0.7s ease-out, height 0.7s ease-out;
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;

    @include from($tablet) {
      width: 100% !important;
    }

    @include phone {
      height: 100% !important;
      display: flex;
    }
  }
}

.isLow .bar-graph {
  &-title,
  &-txt {
    color: var(--danger_0);

    @include phone {
      left: calc(100% + 0.5rem);
    }
  }

  &-title {

    @include from($tablet) {
      margin-top: -3.3rem;
    }
  }
}
</style>
