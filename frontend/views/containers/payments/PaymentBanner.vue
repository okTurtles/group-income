<template lang="pug">
banner-simple(
  severity='info'
  v-if='isCloseToDistributionTime'
  class='c-banner-next-distribution'
)
  i18n.c-description(
    @click='openModal("IncomeDetails")'
    tag='p'
    :args='{ \
      r1: `<button class="link js-btnInvite" data-test="openWarningIncomeDetailsModal">`, \
      r2: "</button>", \
      date: distributionStart \
    }'
  ) Next distribution date is on {date}. Make sure to update your {r1}income details{r2} by then.
</template>

<script>
import { mapGetters } from 'vuex'
import BannerSimple from '@components/banners/BannerSimple.vue'
import { addTimeToDate, humanDate, DAYS_MILLIS, dateFromPeriodStamp } from '@model/contracts/shared/time.js'

export default ({
  name: 'PaymentBanner',
  components: {
    BannerSimple
  },
  computed: {
    ...mapGetters([
      'groupSettings',
      'periodAfterPeriod',
      'distributionDate',
      'periodBeforePeriod'
    ]),
    distributionStart () {
      return humanDate(this.groupSettings.distributionDate, { year: 'numeric', month: 'long', day: 'numeric' })
    },
    isCloseToDistributionTime () {
      const periodBeforePeriod = dateFromPeriodStamp(this.periodBeforePeriod(this.groupSettings.distributionDate))
      const warningDate = addTimeToDate(periodBeforePeriod, 7 * DAYS_MILLIS)

      return Date.now() >= new Date(warningDate).getTime()
    }
  }
}: Object)

</script>
