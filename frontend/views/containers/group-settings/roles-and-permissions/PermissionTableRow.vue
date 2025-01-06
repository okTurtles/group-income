<template lang="pug">
  tr.c-permission-table-row
    td.c-user
      .c-user-wrapper
        // TODO: Use 'AvatarUser.vue' instead and also wrap these with 'ProfileCard.vue'
        //       when implementing it with real data.
        avatar.c-avatar(src='/assets/images/user-avatar-default.png' size='xs')
        strong.c-name Username

    td.c-role
      i18n.pill.is-primary Admin

    td.c-permissions
      span.c-permission-item(v-for='permission in dummyPermissions'
        :key='permission.id') {{ permission.name }}

    td.c-action
      .c-action-wrapper
        button.is-icon-small(type='button' @click='handleMenuClick')
          i.icon-ellipsis-v
</template>

<script>
import Avatar from '@components/Avatar.vue'

export default {
  name: 'PermissionTableRow',
  components: {
    Avatar
  },
  props: {
    role: {
      type: Object
    }
  },
  data () {
    return {
      dummyPermissions: [
        { id: 'view-permissions', name: 'View Permissions' },
        { id: 'add-permissions', name: 'Add Permissions' },
        { id: 'edit-permissions', name: 'Edit Permissions' },
        { id: 'remove-permissions', name: 'Remove Permissions' },
        { id: 'delegate-permissions', name: 'Delegate Permissions' }
      ]
    }
  },
  methods: {
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
  padding-left: 0.5rem;
}
</style>
