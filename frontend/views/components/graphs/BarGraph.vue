<template lang='pug'>
.bar-graph-container(:class='{"c-getting-ready": !isReady}')
  .bar-graph(
    v-for='(bar, index) in bars'
    :key='`percentage-${index}`'
  )
    .bar-graph-column(:class='`has-background-${getResult(bar.total)}`')
      .bar-graph-progress(
        :style='{height: getPercentage(bar.total), width: getPercentage(bar.total)}'
        :class='[{ isLow: isLow(bar.total) }, `has-background-${getResult(bar.total)}-solid`]'
      )
        h4.bar-graph-title {{ bar.title }}
        p.bar-graph-txt {{ bar.total | toPercent }}%

</template>

<script>
import { toPercent } from '@view-utils/filters.js'

export default ({
  name: 'BarGraph',
  props: {
    bars: {
      type: Array, // [{ total, value }]
      default () { return [] }
    }
  },
  data () {
    return {
      isReady: false
    }
  },
  mounted () {
    setTimeout(() => { this.isReady = true }, 0)
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

  &-container {
    display: flex;
    margin: 1.5rem 0 1rem 0;
    gap: 1rem;
    overflow: hidden;

    @include phone {
      flex-direction: column-reverse;
    }
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

.c-getting-ready .bar-graph {
  &-progress {
    height: 0% !important;

    @include phone {
      width: 0% !important;
      height: 100% !important;
    }
  }

  &-title,
  &-txt {
    opacity: 0;
  }
}
</style>
