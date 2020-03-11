<template lang='pug'>
  div
    .c-header
      h4.is-title-4 {{ item.title }}
      p.c-status(:class='{"has-text-success": item.max === item.value}')
        i.icon-check(v-if='item.max === item.value')
        .has-text-1 {{ item.label }}
    progress-bar.c-progress(
      :max='item.max'
      :value='item.value'
      :hasMarks='item.hasMarks'
    )
</template>

<script>
import { mapGetters } from 'vuex'
import ProgressBar from '@components/graphs/Progress.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'PaymentsSummary',
  components: {
    ProgressBar
  },
  computed: {
    ...mapGetters([
      'ourContributionSummary'
    ]),
    item () {
      // TODO - Connect this to store and do the same at Payments.js
      return {
        title: this.ourContributionSummary.receivesMonetary
          ? L('Payments Received')
          : L('Payments Sent'),
        max: 3,
        value: 1,
        hasMarks: true,
        label: L('{value} out of {max}', {
          value: 1,
          max: 3
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-header {
  display: flex;
  margin-bottom: $spacer;
}

.c-status {
  margin-left: $spacer-sm;
}
</style>
