<template lang="pug">
  tr.c-permission-table-row
    td.c-user
      .c-user-wrapper
        // TODO: Use 'AvatarUser.vue' instead and also wrap these with 'ProfileCard.vue'
        //       when implementing it with real data.
        avatar.c-avatar(src='/assets/images/user-avatar-default.png' size='xs')
        strong.c-name {{ data.username }}

    td.c-role
      span.pill.is-primary {{ getRoleDisplayName(data.role ) }}

    td.c-permissions
      .c-permissions-wrapper
        span.c-permission-item(
          v-for='permission in data.permissions'
          :key='permission'
        ) {{ getPermissionDisplayName(permission) }}

    td.c-action
      .c-action-wrapper
        button.is-icon-small(type='button' @click='handleMenuClick')
          i.icon-ellipsis-v
</template>

<script>
import Avatar from '@components/Avatar.vue'
import {
  getRoleDisplayName,
  getPermissionDisplayName
} from './permissions-utils.js'

export default {
  name: 'PermissionTableRow',
  components: {
    Avatar
  },
  props: {
    data: {
      type: Object
    }
  },
  methods: {
    getRoleDisplayName,
    getPermissionDisplayName,
    handleMenuClick () {
      console.log('TODO: Add menus')
    }
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

.c-permissions-wrapper {
  display: flex;
  padding: 0.75rem 0.5rem 0.75rem 0;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
