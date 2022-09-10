<template lang='pug'>
div(:class='isReady ? "" : "c-ready"')
  i18n.is-title-3(
    tag='h2'
  ) TODO history

  i18n(tag='p') Percentage of the payments TODO reached by the group.

  p(v-if='history.length === 0')
    i18n Your group is still in its first month.

  div(v-else)
    bar-graph(:bars='history')
    i18n.has-text-1(tag='p') * This month contains delayed payments for prior months.
</template>

<script>
import { humanDate } from '@model/contracts/shared/time.js'
import BarGraph from '@components/graphs/BarGraph.vue'

export default ({
  name: 'GroupSupportHistory',
  data () {
    return {
      isReady: false,
      history: []
    }
  },
  components: {
    BarGraph
  },
  created () {
    // Todo replace history with real data
    const testNumber = 6
    for (let i = testNumber; i > 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      this.history.push({
        total: 1 / testNumber * (testNumber - i + 1),
        title: humanDate(date, { month: 'long' })
      })
    }
  }
}: Object)
</script>
