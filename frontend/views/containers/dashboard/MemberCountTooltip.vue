<template lang='pug'>
tooltip(:direction='tooltipDirection')
  .link {{ tooltipLabel }}
  template(slot='tooltip')
    div(
      v-for='(item, index) in members'
      :key='`member-${index}`'
    ) {{ stringTemplate(item) }}
</template>

<script>
import Tooltip from '@components/Tooltip.vue'

export default ({
  name: 'MemberCountTooltip',
  components: {
    Tooltip
  },
  props: {
    members: Array,
    tooltipDirection: {
      type: String,
      default: 'bottom-end'
    },
    stringTemplate: {
      type: Function,
      default: value => `${value}`
    }
  },
  computed: {
    tooltipLabel () {
      const len = this.members.length

      return len === 1
        ? this.L('1 member')
        : this.L('{len} members', { len })
    }
  }
})
</script>