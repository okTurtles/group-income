<template lang="pug">
  span.pill.c-role-pill(:class='pillClasses') {{ getRoleDisplayName(role ) }}
</template>

<script>
import { GROUP_ROLES } from '@model/contracts/shared/constants.js'
import { getRoleDisplayName } from './permissions-utils.js'

export default {
  name: 'RolePill',
  props: {
    role: {
      type: String
    }
  },
  computed: {
    pillClasses () {
      if (!this.role) { return '' }

      return ({
        [GROUP_ROLES.ADMIN]: 'is-success',
        [GROUP_ROLES.MODERATOR_DELEGATOR]: 'is-primary',
        [GROUP_ROLES.MODERATOR]: 'is-neutral',
        [GROUP_ROLES.CUSTOM]: 'is-warning'
      })[this.role]
    }
  },
  methods: {
    getRoleDisplayName
  }
}
</script>

<style lang="scss" scoped>
.c-role-pill {
  display: inline;
  white-space: initial;
}
</style>
