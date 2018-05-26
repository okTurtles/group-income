<template>
  <dashboard-section title="Current Settings">
    <div class="columns has-text-centered">
      <div class="column is-4">
        <p class="has-text-weight-bold settings-number" data-test="changePercentage">{{ group.changeThreshold | toPercent }}</p>
        <p class="is-size-5"><i18n>Change Rules</i18n></p>
        <a href="#"><i18n>Propose change</i18n></a>
      </div>
      <div class="column is-4">
        <p class="has-text-weight-bold settings-number" data-test="approvePercentage">{{ group.memberApprovalThreshold | toPercent }}</p>
        <p class="is-size-5"><i18n>Add Member</i18n></p>
        <a href="#"><i18n>Propose change</i18n></a>
      </div>
      <div class="column is-4">
        <p class="has-text-weight-bold settings-number" data-test="removePercentage">{{ group.memberRemovalThreshold | toPercent }}</p>
        <p class="is-size-5"><i18n>Remove Member</i18n></p>
        <a href="#"><i18n>Propose change</i18n></a>
      </div>
    </div>
  </dashboard-section>
</template>
<style lang="scss" scoped>
.settings-number {
  font-size: 4rem;
  line-height: 1.1;
}
</style>
<script>
import DashboardSection from './DashboardSection.vue'
import { toPercent } from '../utils/filters'

export default {
  name: 'GroupSettings',
  components: {
    DashboardSection
  },
  props: {
    group: Object
  },
  filters: {
    toPercent
  }
}
</script>
