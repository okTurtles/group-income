<template>
  <div>
    <p v-if="history.length === 0"><i18n>Your group is still in its first month.</i18n></p>
    <div class="history columns" v-else>
      <div v-for="(percentage, index) in history" class="column is-2" :key="index">
        <div :class="['period', getResult(percentage)]">
          <p class="period-title">{{ months[index] }}</p>
          <p class="period-txt">{{ percentage | toPercent }}</p>
          <span class="period-progress" :style="{height: getPercentage(percentage)}"></span>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
$gapHistory: 0.5rem; // force reduced gap - modifier .is-n avaiable on new bulma version
.history .column {
  padding: $gapHistory; // reduce gap
}

.history.columns {
  margin-left: -$gapHistory;
  margin-right: -$gapHistory;
  margin-top: -$gapHistory;
}

.period {
  position: relative;
  width: 100%;
  display: inline-block;
  padding: 2rem 0;
  color: #fff;
  text-align: center;
  font-size: 2rem;
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
    background-color: #fff;
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
    font-size: 0.7em;
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
<script>
import { toPercent } from '../../utils/filters'

export default {
  name: 'GroupSupportHistory',
  props: {
    history: Array
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
