<template lang='pug'>
div(:class='isReady ? "" : "c-ready"')
  i18n(tag='p') Percentage of the goal reached by the group.

  p(v-if='history.length === 0')
    i18n Your group is still in its first month.

  .history(v-else='')
    .months(
      v-for='(distributed, index) in history'
      :key='`percentage-${index}`'
    )
      div(:class='["period", `has-background-${getResult(distributed.total)}`]')
        .period-progress(
          :style='{height: getPercentage(distributed.total), width: getPercentage(distributed.total)}'
          :class='[{ isLow: isLow(distributed.total) }, `has-background-${getResult(distributed.total)}-solid`]'
        )
          h4.period-title {{ distributed.month }}
          p.period-txt {{ distributed.total | toPercent }}%
</template>

<script>
import {
  humanDate
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path
import { toPercent } from '@view-utils/filters.js'
import { mapGetters } from 'vuex'

export default ({
  name: 'GroupSupportHistory',
  data () {
    return {
      isReady: false,
      history: []
    }
  },
  mounted () {
    setTimeout(() => { this.isReady = true }, 0)
  },
  created () {
    // Todo replace history with real data
    // const payments = Object.values(this.currentGroupState.payments)
    const testNumber = 6
    for (let i = testNumber; i > 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      this.history.push({
        total: 1 / testNumber * (testNumber - i + 1),
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

.history {
  display: flex;
  margin: 1rem 0;
  gap: 1rem;
  overflow: hidden;

  @include phone {
    flex-direction: column-reverse;
  }
}

.months {
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

  &-title,
  &-txt {
    position: relative;
    font-size: 0.875rem;
    color: $white;
    z-index: 2;

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

.isLow {
  .period-title,
  .period-txt {
    color: var(--danger_0);

    @include phone {
      left: calc(100% + 0.5rem);
    }
  }

  .period-title {

    @include from($tablet) {
      margin-top: -3.3rem;
    }
  }
}

.c-ready {
  .period-progress {
    @include from($tablet) {
      height: 0% !important;
    }

    @include phone {
      width: 0% !important;
    }
  }
}
</style>
