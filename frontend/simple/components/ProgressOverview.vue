<template>
  <div class="po-container">
    <div class="level">
      <h3 class="title"><i18n>{{ period }} Overview</i18n></h3>
    </div>
      <div class="level">
        <dl class="level-left summary">
          <dt class="summary-key">
            <i18n>Contributed</i18n>
          </dt>
          <dd class="summary-value">
            $450
          </dd>
          <dt class="summary-key">
            <i18n>Pledged</i18n>
          </dt>
          <dd class="summary-value">
            $800
          </dd>
          <dt class="summary-key">
            <i18n>Goal</i18n>
          </dt>
          <dd class="summary-value">
            $1,000
          </dd>
        </dl>
    </div>
    <div class="notification">
      Progress bar on the way
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
</style>


<script>
  export default {
    name: 'ProgressOverview',
    data () {
      return {
        period: 'July'
      }
    }
  }
</script>
