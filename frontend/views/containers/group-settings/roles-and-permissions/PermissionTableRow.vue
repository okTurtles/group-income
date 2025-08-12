<template lang="pug">
  tr.c-permission-table-row(:class='{ "is-mobile": isMobile }')
    td.td-user
      .c-user-wrapper
        // TODO: Use 'AvatarUser.vue' instead and also wrap these with 'ProfileCard.vue'
        //       when implementing it with real data.
        avatar.c-avatar(src='/assets/images/user-avatar-default.png' size='xs')

        .c-name-and-role-mobile(v-if='isMobile')
          strong.c-name.has-ellipsis {{ data.username }}
          .c-pill-container
            role-pill(:role='data.role')
        strong.c-name.has-ellipsis(v-else) {{ data.username }}

    td.td-role(v-if='!isMobile')
      role-pill(:role='data.role')

    td.td-permissions
      view-permissions(:permissions='data.permissions')

    td.td-action
      .c-action-wrapper
        permission-action-menu
</template>

<script>
import Avatar from '@components/Avatar.vue'
import PermissionActionMenu from './PermissionActionMenu.vue'
import ViewPermissions from './ViewPermissions.vue'
import RolePill from './RolePill.vue'
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
    PermissionActionMenu,
    RolePill
  },
  props: {
    data: {
      type: Object
    },
    isMobile: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    pillClasses () {
      if (!this.data?.role) { return '' }

      return ({
        [GROUP_ROLES.ADMIN]: 'is-success',
        [GROUP_ROLES.MODERATOR_DELEGATOR]: 'is-primary',
        [GROUP_ROLES.MODERATOR]: 'is-neutral',
        [GROUP_ROLES.CUSTOM]: 'is-warning'
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
  padding: 0.75rem 0;

  .c-avatar {
    flex-shrink: 0;
  }

  .c-name-and-role-mobile {
    display: flex;
    flex-direction: column;
    row-gap: 0.25rem;
    align-items: flex-start;
    flex-grow: 1;
    max-width: calc(100% - 2rem);

    .c-name {
      align-self: stretch;
    }
  }
}

td.td-user,
td.td-role {
  padding-right: 0.5rem;
}

.c-permission-table-row.is-mobile td.td-user {
  padding-right: 0.75rem;
  max-width: 10.25rem;
}

td.td-action {
  padding-right: 1rem;

  @include desktop {
    padding-right: 1.5rem;
  }
}

.c-pill-container {
  display: inline-block;
}

.c-action-wrapper {
  display: flex;
  justify-content: flex-end;
}
</style>
