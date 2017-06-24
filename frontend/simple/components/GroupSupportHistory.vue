<script>
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
  methods: {
    monthColor (percentage) {
      if (typeof percentage !== 'number') {
        throw new TypeError('monthColor(percentage) must take a number')
      }

      if (percentage < 0.6) return '#D0011B'
      if (percentage < 1) return '#F6A623'
      return '#9CD445'
    }
  }
}
</script>

<template>
  <section>
    <h3 class="title is-3"><i18n>Support History</i18n></h3>
    <p v-if="history.length === 0">Your group is still in its first month.</p>
    <div v-else>
      <span v-for="(percentage, index) in history" class="month-history" :style="{ background: monthColor(percentage) }">
        <span class="month-name">{{ months[index] }}</span>
        <span class="percentage">{{ Math.floor(percentage * 100) }}%</span>
      </span>
    </div>
  </section>
</template>

<style lang="scss" scoped>
h3.title {
  margin-top: 30px;
}

.month-history {
  color: #FFFFFF;
  display: inline-block;
  height: 107px;
  margin-right: 10px;
  padding-top: 12px;
  text-align: center;
  width: 117px;
}

.month-name {
  display: block;
  font-family: HelveticaNeue-Bold;
  font-size: 28px;
  letter-spacing: 4px;
}

.percentage {
  display: block;
  font-family: HelveticaNeue;
  font-size: 24px;
}
</style>
