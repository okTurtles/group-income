<template lang="pug">
  tr.c-permission-table-row(:class='{ "is-mobile": isMobile }')
    td.td-user
      .c-user-wrapper
        // TODO: Use 'AvatarUser.vue' instead and also wrap these with 'ProfileCard.vue'
        //       when implementing it with real data.
        avatar.c-avatar(src='/assets/images/user-avatar-default.png' size='xs')
        strong.c-name.has-ellipsis {{ data.username }}

    td.td-role-and-permissions-combined(v-if='isMobile')
      .c-role-and-permissions-combined
        .c-pill-container
          span.pill.c-role-pill(:class='pillClasses') {{ getRoleDisplayName(data.role ) }}
        view-permissions(
          :permissions='data.permissions'
          :is-mobile='isMobile'
        )
    template(v-else)
      td.td-role
        span.pill.c-role-pill(:class='pillClasses') {{ getRoleDisplayName(data.role ) }}
      td.td-permissions
        view-permissions(:permissions='data.permissions')

    td.td-action
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
}

td.td-user,
td.td-role {
  padding-right: 0.5rem;
}

td.td-action {
  padding-right: 1rem;

  @include desktop {
    padding-right: 1.5rem;
  }
}

.c-role-pill {
  display: inline;
  white-space: initial;
}

.c-pill-container {
  display: inline-block;
}

.c-role-and-permissions-combined {
  display: flex;
  flex-direction: column;
  row-gap: 0.25rem;
  align-items: flex-start;
  padding: 0.75rem 0.75rem 0.75rem 0;
  min-width: 8.75rem;
}

.c-action-wrapper {
  display: flex;
  justify-content: flex-end;
}

.c-permission-table-row.is-mobile {
  td.td-user {
    padding-right: 0.75rem;
    max-width: 10.25rem;
  }

  .c-user-wrapper {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    row-gap: 0.5rem;
    align-items: center;
    width: 100%;

    .c-name {
      display: inline-block;
      max-width: 7.75rem;
      width: 100%;
    }
  }
}
</style>
