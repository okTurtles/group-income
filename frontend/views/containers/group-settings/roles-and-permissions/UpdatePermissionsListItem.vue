<template lang="pug">
li.c-update-permissions-list-item
  .c-user-info
    avatar-user.c-avatar-user(:contractID='data.userId' size='xs')
    .c-user-info-text
      .c-display-name.has-text-bold {{ getDisplayName(profile) }}
      .c-username @{{ profile.username }}

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

    .c-select-permissions-section
      i18n.c-select-permissions-title.has-text-1 Select permissions:

      .c-perimission-items-container
        permission-piece(
          v-for='permission in config.allPermissions'
          :key='permission'
          :permission='permission'
        )

  .c-remove-entry-container
    button.is-icon-small.is-btn-shifted(
      type='button'
      :aria-label='L("Remove role entry")'
      @click.stop='remove'
    )
      i.icon-times
</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import RolePill from './RolePill.vue'
import PermissionPiece from './PermissionPiece.vue'
import { GROUP_ROLES, GROUP_PERMISSIONS } from '@model/contracts/shared/constants.js'
import { getRoleDisplayName } from './permissions-utils.js'

export default {
  name: 'UpdatePermissionsListItem',
  components: {
    AvatarUser,
    PermissionPiece,
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
        roles: Object.values(GROUP_ROLES),
        allPermissions: Object.values(GROUP_PERMISSIONS)
      },
      ephemeral: {
        selectedRole: ''
      }
    }
  },
  computed: {
    ...mapGetters([
      'globalProfile'
    ]),
    profile () {
      return this.globalProfile(this.data.userId)
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

      this.$emit('update', { role: value })
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
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  column-gap: 0.5rem;
  box-shadow: inset 0 2px 0 $general_2;
  padding: 1.25rem 0;

  @include tablet {
    column-gap: 0.75rem;
  }
}

.c-user-info {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 0.5rem;

  @include tablet {
    max-width: 18rem;
  }

  .c-avatar-user {
    flex-shrink: 0;
  }

  .c-user-info-text {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    font-size: 0.725rem;
    flex-grow: 1;
    max-width: calc(100% - 2rem);

    // TODO: Implement ellipsis style for .c-username and .c-display-name
    .c-display-name,
    .c-username {
      position: relative;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: inherit;
      line-height: 1.2;
    }

    .c-display-name {
      color: $text_0;
    }
  }
}

.c-set-permissions-container {
  position: relative;
  width: 100%;
  flex-grow: 1;
}

.c-select-role-section {
  @include tablet {
    max-width: 12.75rem;
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
  margin-top: 2rem;
}

.c-perimission-items-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
