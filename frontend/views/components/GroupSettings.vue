<template>
  <div class="columns has-text-centered">
    <div class="column is-4">
      <p class="has-text-weight-bold settings-number" data-test="changePercentage">{{ group.changeThreshold | toPercent }}</p>
      <p class="is-size-5"><i18n>Change Rules</i18n></p>
      <a @click.prevent="openProposal('RuleChangeRule')"><i18n>Propose change</i18n></a>
    </div>
    <div class="column is-4">
      <p class="has-text-weight-bold settings-number" data-test="approvePercentage">{{ group.memberApprovalThreshold | toPercent }}</p>
      <p class="is-size-5"><i18n>Add Member</i18n></p>
      <a @click.prevent="openProposal('RuleAddMember')"><i18n>Propose change</i18n></a>
    </div>
    <div class="column is-4">
      <p class="has-text-weight-bold settings-number" data-test="removePercentage">{{ group.memberRemovalThreshold | toPercent }}</p>
      <p class="is-size-5"><i18n>Remove Member</i18n></p>
      <a @click.prevent="openProposal('RuleRemoveMember')"><i18n>Propose change</i18n></a>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.settings-number {
  font-size: 4rem;
  line-height: 1.1;
}
</style>
<script>
import sbp from '../../../shared/sbp.js'
import { toPercent } from '../utils/filters.js'
import { LOAD_MODAL } from '../../utils/events.js'

export default {
  name: 'GroupSettings',
  props: {
    group: Object
  },
  filters: {
    toPercent
  },
  methods: {
    openProposal (component) {
      sbp('okTurtles.events/emit', LOAD_MODAL, component)
    }
  }
}
</script>
