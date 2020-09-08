<template lang='pug'>
div
  i18n(tag='p') Percentage of the goal reached by the group.

  p(v-if='history.length === 0')
    i18n Your group is still in its first month.

  .history(v-else='')
    .months(
      v-for='(percentage, index) in history'
      :key='`percentage-${index}`'
    )
      div(:class='["period", getResult(percentage)]')
        p.period-title {{ months[index] }}
        p.period-txt {{ percentage | toPercent }}
        span.period-progress(:style='{height: getPercentage(percentage)}')
</template>

<script>
import { toPercent } from '@view-utils/filters.js'

export default {
  name: 'GroupSupportHistory',
  props: {
    history: {
      type: Array,
      default: () => []
    }
  },
  data () {
    return {
      months: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    }
  },
  computed: {
  },
  methods: {
    getPercentage (percentage) {
      return percentage >= 1 ? '100%' : `${Math.floor(percentage * 100)}%`
    },
    getResult (percentage) {
      if (percentage < 0.6) return 'has-background-danger'
      if (percentage < 1) return 'has-background-warning'
      return 'has-background-success'
    }
  },
  filters: {
    toPercent
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.history {
  display: flex;
  margin: 0.5rem;
}

.months {
  padding: 0.5rem;
}

.period {
  position: relative;
  width: 100%;
  display: inline-block;
  padding: 2rem 0;
  color: $background_0;
  text-align: center;
  font-size: $size_1;
  line-height: 1.2;

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

  &-title,
  &-txt {
    position: relative;
    z-index: 2;
  }

  &-title {
    font-weight: 600;
    margin-bottom: 0.3rem;
  }

  &-txt {
    font-size: 0.7rem;
  }

  &-progress {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    background-color: inherit;
    opacity: 0.8;
  }
}
</style>
