<template lang="pug">
component(
  is='Tooltip'
  :key='members.length'
  triggerElementSelector='.t-trigger'
  direction='bottom-end'
)
  // The reason for not directly using <tooltip /> component and specifying 'key' attr here is,
  // to fix a bug where the tooltip content(which is emplate(slot='tooltip') below) is lost when 'slot' is updated.
  slot

  template(v-if='members' slot='tooltip')
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
