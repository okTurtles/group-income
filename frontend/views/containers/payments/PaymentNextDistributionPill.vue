<template lang="pug">
  i18n.c-distribution-chip.pill.is-primary(
    :args='{ dDate: nextDistributionDateShort }'
  ) Next distribution Date: {dDate}
</template>

<script>
import { mapGetters } from 'vuex'
import { humanDate } from '@model/contracts/shared/time.js'

export default ({
  name: 'PaymentNextDistributionPill',
  computed: {
    ...mapGetters([
      'groupSettings',
      'periodAfterPeriod'
    ]),
    nextDistributionDateShort () {
      const nextDisDate = this.periodAfterPeriod(this.groupSettings.distributionDate)

      return humanDate(nextDisDate, { month: 'short', day: 'numeric' })
    }
  }
})
</script>

<style lang="scss" scoped>
.c-distribution-chip {
  padding: 0.25rem 0.75rem;
  border-radius: 1.6rem;
}
</style>
