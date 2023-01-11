<template lang="pug">
component(
  is='Tooltip'
  :key='members.length'
  :opacity='members.length === 0 ? 0 : 0.95'
  triggerElementSelector='.t-trigger'
  direction='bottom-end'
)
  // The reason for using <component /> tag here instead of <tooltip /> and specifying "key" attr is,
  // to fix the bug where the link between the tooltip content(template(slot='tooltip') below) and the trigger target element(.t-trigger)
  // gets broken when "members" prop is updated. Tooltip gets destoryed and re-mounted in response to the prop change this way.
  slot

  template(v-if='members && members.length' slot='tooltip')
    div(
      v-for='(name, index) in members'
      :key='`member-${index}`'
    ) {{ name }}
</template>

<script>
import Tooltip from '@components/Tooltip.vue'

export default ({
  name: 'SentenceWithMemberTooltip',
  components: {
    Tooltip
  },
  props: {
    members: Array
  }
}: Object)
</script>

<style lang="scss" scoped>
.has-zero-members ::v-deep .c-tooltip {
  display: none !important;
}
</style>
