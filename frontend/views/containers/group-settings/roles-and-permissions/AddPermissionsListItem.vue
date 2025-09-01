<template lang="pug">
li.c-update-permissions-list-item
  .c-user-info
    member-name.c-member-name(:memberID='data.userId')

  .c-set-permissions-container
    .c-select-role-section
      i18n.c-select-role-title.has-text-1 Select a role:

      .selectbox.c-role-select-input
        select.select(
          :aria-label='L("Select role")'
          :value='ephemeral.selectedRole'
          @change='updateRole'
        )
          i18n(tag='option' disabled value='') Select a role
          option(
            v-for='role in config.roles'
            :key='role'
            :value='role'
          ) {{ getRoleDisplayName(role) }}

    .c-select-permissions-section(v-if='ephemeral.selectedRole')
      .c-select-permissions-title.has-text-1 {{ permissionSectionLabel }}

      .c-perimission-items-container
        permission-piece(
          v-for='permission in config.permissionPresets[ephemeral.selectedRole]'
          :key='permission'
          :permission='permission'
          :isSelectable='isCustomRole'
          :active='checkPermissionActive(permission)'
          @change='onPermissionItemChange'
        )

  .c-cta-container
    button.is-icon-small.is-btn-shifted.c-remove-btn(
      type='button'
      :aria-label='L("Remove role entry")'
      @click.stop='remove'
    )
      i.icon-trash-alt
</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import MemberName from './MemberName.vue'
import RolePill from './RolePill.vue'
import PermissionPiece from './PermissionPiece.vue'
import { GROUP_ROLES, GROUP_PERMISSIONS_PRESET } from '@model/contracts/shared/constants.js'
import { getRoleDisplayName } from './permissions-utils.js'
import { uniq } from 'turtledash'
import { L } from '@common/common.js'

export default {
  name: 'AddPermissionsListItem',
  components: {
    AvatarUser,
    PermissionPiece,
    MemberName,
    RolePill
  },
  props: {
    data: {
      type: Object, // { userId: string, role: string, permissions: string[] }
      required: true
    }
  },
  data () {
    return {
      config: {
        roles: [
          GROUP_ROLES.MODERATOR_DELEGATOR,
          GROUP_ROLES.MODERATOR,
          GROUP_ROLES.CUSTOM
        ],
        permissionPresets: {
          [GROUP_ROLES.ADMIN]: GROUP_PERMISSIONS_PRESET.ADMIN,
          [GROUP_ROLES.MODERATOR]: GROUP_PERMISSIONS_PRESET.MODERATOR,
          [GROUP_ROLES.MODERATOR_DELEGATOR]: GROUP_PERMISSIONS_PRESET.MODERATOR_DELEGATOR,
          [GROUP_ROLES.CUSTOM]: GROUP_PERMISSIONS_PRESET.CUSTOM
        }
      },
      ephemeral: {
        selectedRole: '',
        selectedPermissions: []
      }
    }
  },
  computed: {
    ...mapGetters([
      'globalProfile'
    ]),
    profile () {
      return this.globalProfile(this.data.userId)
    },
    isCustomRole () {
      return this.ephemeral.selectedRole === GROUP_ROLES.CUSTOM
    },
    permissionSectionLabel () {
      return this.isCustomRole ? L('Customize permissions:') : L('Permissions granted:')
    }
  },
  methods: {
    getRoleDisplayName,
    initState () {
      this.ephemeral.selectedRole = this.data.role || null
    },
    getDisplayName (profile) {
      return profile.displayName || profile.username
    },
    remove () {
      this.$emit('remove', this.data.userId)
    },
    updateRole (e) {
      const value = e.target.value
      this.ephemeral.selectedRole = value

      if (value === GROUP_ROLES.CUSTOM) {
        const isCurrentRoleCustom = this.profile.role?.name === GROUP_ROLES.CUSTOM
        this.ephemeral.selectedPermissions = isCurrentRoleCustom
          ? this.profile.role.permissions || []
          : []
      } else {
        this.ephemeral.selectedPermissions = this.config.permissionPresets[value]
      }

      this.emitUpdateEvent()
    },
    checkPermissionActive (permission) {
      if (!this.isCustomRole) { return false }

      return this.ephemeral.selectedPermissions.includes(permission)
    },
    onPermissionItemChange (payload) {
      const { permission, active } = payload

      if (active) {
        this.ephemeral.selectedPermissions = uniq([
          ...this.ephemeral.selectedPermissions,
          permission
        ])
      } else {
        this.ephemeral.selectedPermissions = this.ephemeral.selectedPermissions.filter(p => p !== permission)
      }

      this.emitUpdateEvent()
    },
    emitUpdateEvent () {
      this.$emit('update', {
        userId: this.data.userId,
        role: this.ephemeral.selectedRole,
        permissions: this.ephemeral.selectedPermissions
      })
    }
  },
  created () {
    this.initState()
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-update-permissions-list-item {
  position: relative;
  display: grid;
  grid-template-rows: auto auto;
  grid-template-columns: auto auto;
  grid-template-areas:
    "c-user-info c-cta-container"
    "c-set-permissions c-set-permissions";
  align-items: start;
  gap: 0.5rem;
  box-shadow: inset 0 2px 0 $general_2;
  padding: 1.25rem 0;
  width: 100%;

  @include tablet {
    grid-template-rows: auto;
    grid-template-columns: auto 1fr auto;
    grid-template-areas: "c-user-info c-set-permissions c-cta-container";
    column-gap: 0.75rem;
    padding: 1.75rem 0;
  }
}

.c-user-info {
  grid-area: c-user-info;
  position: relative;
  width: 100%;
  min-width: 0;
  display: block;

  @include tablet {
    width: 15rem;
    margin-top: 0.25rem;
  }
}

.c-set-permissions-container {
  grid-area: c-set-permissions;
  position: relative;
  width: 100%;
  flex-grow: 1;
}

.c-select-role-section {
  margin-top: 1rem;

  @include tablet {
    max-width: 12.75rem;
    margin-top: 0;
  }
}

.c-select-role-title,
.c-select-permissions-title {
  display: block;
  margin-bottom: 0.5rem;
}

.c-role-select-input {
  &::after {
    right: 0.75rem;
  }

  .select {
    height: 2rem;
    padding-left: 0.75rem;
    padding-right: 1.5rem;
    font-size: $size_4;
  }
}

.c-select-permissions-section {
  margin-top: 1.5rem;

  @include tablet {
    margin-top: 2rem;
  }
}

.c-perimission-items-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.c-cta-container {
  grid-area: c-cta-container;
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;

  button.c-remove-btn {
    width: 1.75rem;
    height: 1.75rem;
    color: $danger_0_1;
    background-color: $danger_2;

    &:hover,
    &:focus {
      color: $danger_0;
      background-color: $general_1;
    }
  }
}
</style>
