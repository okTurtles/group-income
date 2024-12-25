<template lang="pug">
component(
  is='Tooltip'
  :key='members.length'
  :opacity='members.length === 0 ? 0 : 0.95'
  triggerElementSelector='.t-trigger'
  direction='bottom'
  :anchorToElement='true'
)
  // The reason for using <component /> tag here instead of <tooltip /> and specifying 'key' attr is,
  // to fix the bug where the link between the tooltip content(template(slot='tooltip') below) and the trigger target element(.t-trigger)
  // gets broken when "members" prop is updated. Tooltip gets destoryed and re-mounted in response to the prop change this way.
  slot

  template(v-if='members && members.length' slot='tooltip')
    .c-member-name(
      v-for='(name, index) in members'
      :key='`member-${index}`'
    )
      .has-ellipsis {{ name }}
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
.c-member-name {
  // Turn the parent element into flex-box to render ellipsis style properly.
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
</style>
