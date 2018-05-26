<template>
  <dashboard-section title="Current Settings">
    <div class="columns has-text-centered">
      <div class="column is-4">
        <p class="has-text-weight-bold settings-number" data-test="changePercentage">{{ group.changeThreshold | toPercent }}</p>
        <p class="is-size-5">Change Rules</p>
        <a href="#">Propose change</a>
      </div>
      <div class="column is-4">
        <p class="has-text-weight-bold settings-number" data-test="approvePercentage">{{ group.memberApprovalThreshold | toPercent }}</p>
        <p class="is-size-5">Add Member</p>
        <a href="#">Propose change</a>
      </div>
      <div class="column is-4">
        <p class="has-text-weight-bold settings-number" data-test="removePercentage">{{ group.memberRemovalThreshold | toPercent }}</p>
        <p class="is-size-5">Remove Member</p>
        <a href="#">Propose change</a>
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
