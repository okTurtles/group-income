<template>
  <section>
    <h3 class="title"><i18n>Support History</i18n></h3>
    <p v-if="history.length === 0">Your group is still in its first month.</p>
    <div class="history" v-else>
      <div v-for="(percentage, index) in history" class="period" :style="{ background: themeColor }">
        <p class="period-title">{{ months[index] }}</p>
        <p class="period-txt">{{ Math.floor(percentage * 100) }}%</p>
        <span class="period-progress" :style="{height: getPercentage(percentage)}"></span>
      </div>
    </div>
  </section>
</template>
<style lang="scss" scoped>
.period {
  position: relative;
  display: inline-block;
  width: 16.66%;
  max-width: 10rem;
  padding: 2rem 0;
  color: #fff;
  border: 5px solid white;
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
    content: '';
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
  export default {
    name: 'GroupSupportHistory',
    props: {
      history: Array
    },
    data () {
      return {
        themeColor: '#7733b4', // The layout palette will adjust :D
        months: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
      }
    },
    methods: {
      getPercentage (percentage) {
        return percentage >= 1 ? '100%' : `${Math.floor(percentage * 100)}%`
      }
    }
  }
</script>
