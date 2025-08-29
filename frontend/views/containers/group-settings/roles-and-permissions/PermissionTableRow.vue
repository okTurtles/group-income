<template lang="pug">
  tr.c-permission-table-row(:class='{ "is-mobile": isMobile }')
    td.td-user
      .c-user-wrapper
        avatar-user.c-avatar(:contractID='data.memberID' size='xs')

        .c-name-and-role-mobile(v-if='isMobile')
          strong.c-name.has-ellipsis {{ userDisplayName }}
          .c-pill-container
            role-pill(:role='data.roleName')
        strong.c-name.has-ellipsis(v-else) {{ userDisplayName }}

    td.td-role(v-if='!isMobile')
      role-pill(:role='data.roleName')

    td.td-permissions
      view-permissions(:permissions='data.permissions')

    td.td-action(v-if='!isAdmin && !isMe && canDelegatePermissions')
      .c-action-wrapper
        permission-action-menu(@remove='openRemoveRoleModal')
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import PermissionActionMenu from './PermissionActionMenu.vue'
import ViewPermissions from './ViewPermissions.vue'
import RolePill from './RolePill.vue'
import { OPEN_MODAL } from '@utils/events.js'
import { GROUP_ROLES, GROUP_PERMISSIONS } from '@model/contracts/shared/constants.js'
import {
  getRoleDisplayName,
  getPermissionDisplayName
} from './permissions-utils.js'
import { L } from '@common/common.js'

export default {
  name: 'PermissionTableRow',
  components: {
    AvatarUser,
    ViewPermissions,
    PermissionActionMenu,
    RolePill
  },
  props: {
    data: {
      type: Object // { roleName: string, permissions: string[], memberID: string }
    },
    isMobile: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      ephemeral: {
        isSubmitting: false
      }
    }
  },
  computed: {
    ...mapGetters([
      'userDisplayNameFromID',
      'ourIdentityContractId',
      'ourGroupPermissionsHas'
    ]),
    canDelegatePermissions () {
      return this.ourGroupPermissionsHas(GROUP_PERMISSIONS.DELEGATE_PERMISSIONS)
    },
    isMe () {
      return this.data.memberID === this.ourIdentityContractId
    },
    isAdmin () {
      return this.data.roleName === GROUP_ROLES.ADMIN
    },
    userDisplayName () {
      const displayName = this.userDisplayNameFromID(this.data.memberID)
      return this.isMe ? `${displayName} (${L('you')})` : displayName
    },
    pillClasses () {
      if (!this.data?.roleName) { return '' }

      return ({
        [GROUP_ROLES.ADMIN]: 'is-success',
        [GROUP_ROLES.MODERATOR_DELEGATOR]: 'is-primary',
        [GROUP_ROLES.MODERATOR]: 'is-neutral',
        [GROUP_ROLES.CUSTOM]: 'is-warning'
      })[this.data.roleName]
    }
  },
  methods: {
    getRoleDisplayName,
    getPermissionDisplayName,
    openRemoveRoleModal () {
      sbp('okTurtles.events/emit',
        OPEN_MODAL,
        'RemoveRoleModal',
        undefined,
        { data: this.data }
      )
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
