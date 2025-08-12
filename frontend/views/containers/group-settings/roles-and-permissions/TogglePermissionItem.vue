<template lang='pug'>
  .button.is-outlined.is-small(
    v-on='$listeners'
  ) {{ getPermissionDisplayName(permission) }}
</template>

<script>
import { getPermissionDisplayName } from './permissions-utils.js'

export default {
  name: 'TogglePermissionItem',
  props: {
    permission:  String
  },
  methods: {
    getPermissionDisplayName
  }
}
</script>
