<template>
  <dashboard-section :title="`${period} Overview`">
    <div class="level">
      <dl class="level-left summary" :style="{ color: themeColor }">
        <dt class="summary-key">
          <i18n>Contributed</i18n>
        </dt>
        <dd class="summary-value metric-primaryText">
          {{contributedFormatted}}
        </dd>
        <dt class="summary-key">
          <i18n>Pledged</i18n>
        </dt>
        <dd class="summary-value metric-secondaryText">
          {{pledgedFormatted}}
        </dd>
        <dt class="summary-key">
          <i18n>Goal</i18n>
        </dt>
        <dd class="summary-value">
          {{goalFormatted}}
        </dd>
      </dl>
  </div>
  <div class="bar" :style="{ backgroundColor: themeColor }">
      <span class="bar-progress metric-secondary" :style="{ width: barPercentage.pledged }"></span>
      <span class="bar-progress metric-primary" :style="{ width: barPercentage.contributed }"></span>
  </div>
  </dashboard-section>
</template>

<style lang="scss" scoped>
  .summary {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-items: flex-start;
    max-height: 3rem;
    margin-top: 0.5rem;

    &-key {
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      min-width: 7.5rem;
      margin-right: 1rem;
      color: #616161;
    }

    &-value {
      font-size: 1.7rem;
      line-height: 1;
      font-weight: 600;
      color: #616161;
    }
  }

  .bar {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 2.2rem;

    &::before,
    &-progress {
      position: absolute;
      display: block;
      top: 0;
      left: 0;
      height: 100%;
      background-color: inherit;
    }

    &::before {
      content: "";
      width: 100%;
      opacity: 0.8;
      background-color: #fff;
    }
  }

  .metric-primary {
    opacity: 0.8;

    &Text {
      color: inherit;
      opacity: 1;
    }
  }

  .metric-secondary {
    opacity: 0.5;

    &Text {
      color: inherit;
      opacity: 0.8;
    }
  }
</style>
<script>
import DashboardSection from './DashboardSection.vue'

export default {
  name: 'ProgressOverview',
  components: {
    DashboardSection
  },
  data () {
    return {
      period: 'July',
      themeColor: '#f89201', // The layout palette will adjust
      contributed: 350,
      pledged: 800,
      goal: 1000,
      contributedFormatted: '$350',
      pledgedFormatted: '$800',
      goalFormatted: '$1,000'
    }
  },
  computed: {
    barPercentage: function () {
      return {
        pledged: `${Math.floor(this.pledged * 100 / this.goal)}%`,
        contributed: `${Math.floor(this.contributed * 100 / this.goal)}%`
      }
    }
  }
}
</script>
