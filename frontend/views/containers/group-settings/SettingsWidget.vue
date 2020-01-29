<template lang='pug'>
.columns.has-text-centered
  .column.is-title-4
    p.has-text-weight-bold.settings-number(data-test='changePercentage')
      | {{ group.changeThreshold | toPercent }}
    p.is-size-5
      i18n Change Rules
    a.link(
      @click.prevent='openProposal("RuleChangeRuleProposal")'
    )
      i18n Propose change

  .column.is-title-4
    p.has-text-weight-bold.settings-number(data-test='approvePercentage')
      | {{ group.memberApprovalThreshold | toPercent }}
    p.is-size-5
      i18n Add Member
    a.link(
      @click.prevent='openProposal("RuleAddMemberProposal")'
    )
      i18n Propose change

  .column.is-title-4
    p.has-text-weight-bold.settings-number(data-test='removePercentage')
      | {{ group.memberRemovalThreshold | toPercent }}

    p.is-size-5
      i18n Remove Member
    a.link(
      @click.prevent='openProposal("RuleRemoveMemberProposal")'
    )
      i18n Propose change
</template>

<script>
import sbp from '~/shared/sbp.js'
import { toPercent } from '@view-utils/filters.js'
import { OPEN_MODAL } from '@utils/events.js'

export default {
  name: 'GroupSettingsWidget',
  props: {
    group: Object
  },
  filters: {
    toPercent
  },
  methods: {
    openProposal (component) {
      sbp('okTurtles.events/emit', OPEN_MODAL, component)
    }
  }
}
</script>

<style lang="scss" scoped>
.settings-number {
  font-size: $spacer-xl;
  line-height: 1.1;
}
</style>
