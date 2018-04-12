<template>
  <section>
    <div class="level">
      <h3 class="title"><i18n>{{ period }} Overview</i18n></h3>
    </div>
      <div class="level">
        <dl class="level-left summary">
          <dt class="summary-key">
            <i18n>Contributed</i18n>
          </dt>
          <dd class="summary-value metric-primaryText" :style="{ color: themeColor }">
            {{contributedFormatted}}
          </dd>
          <dt class="summary-key">
            <i18n>Pledged</i18n>
          </dt>
          <dd class="summary-value metric-secondaryText" :style="{ color: themeColor }">
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
  </div>
</template>

<style lang="scss" scoped>
  .po-container {
    margin: 4rem 0;
  }

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
    }

    &-value {
      font-size: 1.7rem;
      line-height: 1;
      font-weight: 600;
    }
  }

  .bar {
    position: relative;
    width: 100%;
    height: 2.5rem;

    &::before,
    &-progress {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background-color: inherit;
    }

    &::before {
      content: '';
      width: 100%;
      opacity: 0.8;
      background-color: #fff;
    }
  }

  .metric-primary {
    opacity: 0.8;

    &Text {
      opacity: 0.9;
    }
  }

  .metric-secondary {
    opacity: 0.5;

    &Text {
      opacity: 0.7;
    }
  }
</style>


<script>
  export default {
    name: 'ProgressOverview',
    data () {
      return {
        period: 'July',
        themeColor: '#319d2f', // The summary and bar color will adjust :D
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
