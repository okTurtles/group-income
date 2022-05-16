<template lang='pug'>
div
  i18n(tag='p') Percentage of the goal reached by the group.

  p(v-if='history.length === 0')
    i18n Your group is still in its first month.

  .history(v-else='')
    .months(
      v-for='(distributed, index) in history'
      :key='`percentage-${index}`'
    )
      div(:class='["period", getResult(distributed.total)]')
        .period-progress(
          :style='{height: getPercentage(distributed.total)}'
          :class='{ isLow: isLow(distributed.total) }'
        )
          h4.period-title {{ distributed.month }}
          p.period-txt {{ distributed.total | toPercent }}
</template>

<script>
import { toPercent } from '@view-utils/filters.js'
import { humanDate } from '@utils/time.js'
import { mapGetters } from 'vuex'

export default ({
  name: 'GroupSupportHistory',
  data () {
    return {
      history: []
    }
  },
  created () {
    // Todo replace history with real data
    // const payments = Object.values(this.currentGroupState.payments)
    const testNumber = 5
    for (let i = 1; i <= testNumber; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      this.history.push({
        total: 1 / testNumber * i,
        month: humanDate(date, { month: 'long' })
      })
    }
  },
  computed: {
    ...mapGetters(['currentGroupState'])
  },
  methods: {
    getPercentage (percentage) {
      return percentage >= 1 ? '100%' : `${Math.floor(percentage * 100)}%`
    },
    getResult (percentage) {
      if (percentage < 0.6) return 'has-background-danger-solid'
      if (percentage < 1) return 'has-background-warning-solid'
      return 'has-background-success-solid'
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

.history {
  display: flex;
  margin: 1rem 0;
  gap: 1rem;
  overflow: auto;
}

.months {
  max-width: 6.25rem;
  width: 100%;
}

.period {
  position: relative;
  width: 100%;
  display: inline-block;
  min-height: 12.5rem;
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
    font-size: 0.875rem;
    color: $white;
    z-index: 2;
  }

  &-title {
    font-weight: 600;
    padding: 0.5rem 0.3rem 0.2rem 0.3rem;
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

.isLow {
  .period-title,
  .period-txt {
    color: var(--danger_0);
  }

  .period-title {
    margin-top: -3.3rem;
  }
}
</style>
