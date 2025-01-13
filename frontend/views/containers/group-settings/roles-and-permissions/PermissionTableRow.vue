<template lang="pug">
  tr.c-permission-table-row
    td.c-user
      .c-user-wrapper
        // TODO: Use 'AvatarUser.vue' instead and also wrap these with 'ProfileCard.vue'
        //       when implementing it with real data.
        avatar.c-avatar(src='/assets/images/user-avatar-default.png' size='xs')
        strong.c-name {{ data.username }}

    td.c-role
      span.pill.c-role-pill(:class='pillClasses') {{ getRoleDisplayName(data.role ) }}

    td.c-permissions
      view-permissions(:permissions='data.permissions')

    td.c-action
      .c-action-wrapper
        permission-action-menu(role='admin')
</template>

<script>
import Avatar from '@components/Avatar.vue'
import PermissionActionMenu from './PermissionActionMenu.vue'
import ViewPermissions from './ViewPermissions.vue'
import { GROUP_ROLES } from '@model/contracts/shared/constants.js'
import {
  getRoleDisplayName,
  getPermissionDisplayName
} from './permissions-utils.js'

export default {
  name: 'PermissionTableRow',
  components: {
    Avatar,
    ViewPermissions,
    PermissionActionMenu
  },
  props: {
    data: {
      type: Object
    }
  },
  computed: {
    pillClasses () {
      if (!this.data?.role) { return '' }

      return ({
        [GROUP_ROLES.ADMIN]: 'is-success',
        [GROUP_ROLES.MODERATOR_DELEGATOR]: 'is-primary',
        [GROUP_ROLES.MODERATOR]: 'is-warning',
        [GROUP_ROLES.CUSTOM]: 'is-general'
      })[this.data.role]
    }
  },
  methods: {
    getRoleDisplayName,
    getPermissionDisplayName
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-user-wrapper {
  display: flex;
  align-items: center;
  column-gap: 0.5rem;
}

td.c-user,
td.c-role {
  padding-right: 0.5rem;
}

.c-action-wrapper {
  display: flex;
  justify-content: flex-end;
}

.c-role-pill {
  display: inline;
  white-space: initial;
}
</style>
