<template lang='pug'>
  modal-template.has-background(
    ref='modal'
    :a11yTitle='config.title'
  )
    template(slot='title')
      span {{ config.title }}

    form.c-form(v-if='data' @submit.prevent='')
      ul.c-update-table
        li.c-table-list-item
          i18n.c-label(tag='label') Member:
          .c-list-item-content
            member-name.c-member-name(:memberID='data.memberID')

        li.c-table-list-item
          i18n.c-label(tag='label') Role:
          .selectbox.c-role-select-input.c-list-item-content
            select.select(
              :aria-label='L("Select role")'
              :value='ephemeral.role'
              @change='updateRole'
            )
              i18n(tag='option' disabled value='') Select a role
              option(
                v-for='role in config.roles'
                :key='role'
                :value='role'
              ) {{ getRoleDisplayName(role) }}

        li.c-table-list-item
          label.c-label {{ permissionSectionLabel }}
          .c-list-item-content.c-perimission-items-container
            permission-piece(
              v-for='permission in permissionsToDisplay'
              :key='permission'
              :permission='permission'
              :isSelectable='isCustomRole'
              :active='checkPermissionActive(permission)'
              @change='onPermissionItemChange'
            )

      banner-scoped.c-feedback-banner(ref='formMsg' allow-a)

      .buttons.c-button-container
        i18n.is-outlined(
          tag='button'
          @click.prevent='close'
        ) Cancel

        button-submit.is-success(@click='submit' :disabled='!enableSubmitBtn') Update
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import MemberName from './MemberName.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import PermissionPiece from './PermissionPiece.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import { GROUP_ROLES, GROUP_PERMISSIONS_PRESET, GROUP_PERMISSION_UPDATE_ACTIONS } from '@model/contracts/shared/constants.js'
import { GROUP_PERMISSIONS_UPDATE_SUCCESS } from '@utils/events.js'
import { CLOSE_MODAL } from '@utils/events.js'
import { getRoleDisplayName } from './permissions-utils.js'
import { L } from '@common/common.js'
import { uniq } from 'turtledash'

export default {
  name: 'EditPermissionsModal',
  components: {
    ModalTemplate,
    ButtonSubmit,
    BannerScoped,
    PermissionPiece,
    MemberName
  },
  props: {
    data: {
      // { roleName: string, permissions: string[], memberID: string }
      type: Object
    }
  },
  data () {
    return {
      config: {
        title: L('Edit member permissions'),
        roles: [
          GROUP_ROLES.MODERATOR_DELEGATOR,
          GROUP_ROLES.MODERATOR,
          GROUP_ROLES.CUSTOM
        ],
        permissionPresets: {
          [GROUP_ROLES.MODERATOR]: GROUP_PERMISSIONS_PRESET.MODERATOR,
          [GROUP_ROLES.MODERATOR_DELEGATOR]: GROUP_PERMISSIONS_PRESET.MODERATOR_DELEGATOR,
          [GROUP_ROLES.CUSTOM]: GROUP_PERMISSIONS_PRESET.CUSTOM
        }
      },
      ephemeral: {
        role: null,
        permissions: []
      }
    }
  },
  computed: {
    ...mapGetters([
      'userDisplayNameFromID',
      'usernameFromID'
    ]),
    isCustomRole () {
      return this.ephemeral.role === GROUP_ROLES.CUSTOM
    },
    permissionSectionLabel () {
      return this.isCustomRole ? L('Customize permissions:') : L('Permissions granted:')
    },
    permissionsToDisplay () {
      return this.config.permissionPresets[this.ephemeral.role]
    },
    enableSubmitBtn () {
      const isCurrentRoleCustom = this.data.roleName === GROUP_ROLES.CUSTOM
      const { permissions, role } = this.ephemeral

      if (isCurrentRoleCustom) {
        return role !== GROUP_ROLES.CUSTOM || (
          permissions.length !== this.data.permissions.length ||
          permissions.some(p => !this.data.permissions.includes(p))
        )
      } else {
        return role === GROUP_ROLES.CUSTOM
          ? permissions.length > 0
          : role !== this.data.roleName
      }
    }
  },
  methods: {
    getRoleDisplayName,
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL, 'EditPermissionsModal')
    },
    async submit () {
      try {
        this.$refs.formMsg.clean()

        await sbp('gi.actions/group/updatePermissions', {
          contractID: this.$store.state.currentGroupId,
          data: [{
            memberID: this.data.memberID,
            action: GROUP_PERMISSION_UPDATE_ACTIONS.EDIT,
            roleName: this.ephemeral.role,
            permissions: this.ephemeral.permissions
          }]
        })

        sbp('okTurtles.events/emit', GROUP_PERMISSIONS_UPDATE_SUCCESS, {
          groupContractID: this.$store.state.currentGroupId,
          action: GROUP_PERMISSION_UPDATE_ACTIONS.EDIT
        })
        this.close()
      } catch (e) {
        console.error('EditPermissionsModal.vue submit() caught error: ', e)
        this.$refs.formMsg.danger(e.message)
      }
    },
    initComponent () {
      this.ephemeral.role = this.data.roleName
      this.ephemeral.permissions = this.data.permissions
    },
    updateRole (e) {
      const value = e.target.value
      this.ephemeral.role = value

      if (value === GROUP_ROLES.CUSTOM) {
        const isCurrentRoleCustom = this.data.roleName === GROUP_ROLES.CUSTOM
        this.ephemeral.permissions = isCurrentRoleCustom
          ? this.data.permissions
          : []
      } else {
        this.ephemeral.permissions = GROUP_PERMISSIONS_PRESET[value]
      }
    },
    onPermissionItemChange (payload) {
      const { permission, active } = payload

      if (active) {
        this.ephemeral.permissions = uniq([
          ...this.ephemeral.permissions,
          permission
        ])
      } else {
        this.ephemeral.permissions = this.ephemeral.permissions.filter(p => p !== permission)
      }
    },
    checkPermissionActive (permission) {
      if (!this.isCustomRole) { return false }

      return this.ephemeral.permissions.includes(permission)
    }
  },
  created () {
    if (this.data?.memberID) {
      this.initComponent()
    } else {
      this.close()
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

$modal_narrow_point: 450px;

.c-update-table {
  position: relative;
  width: 100%;
  box-shadow: inset 0 -2px 0 $general_2;

  .c-table-list-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    width: 100%;
    padding: 1.25rem 0;
    row-gap: 0.75rem;

    &:not(:last-child) {
      box-shadow: inset 0 -2px 0 $general_2;
    }

    @include from($modal_narrow_point) {
      flex-direction: row;
      column-gap: 0.5rem;
      row-gap: 0;
    }

    @include tablet {
      column-gap: 0.75rem;
    }
  }
}

.c-label {
  display: inline-block;
  font-size: $size_5;
  color: $text_1;
  text-transform: uppercase;
  flex-shrink: 0;
  width: 100%;

  @include from($modal_narrow_point) {
    width: 7rem;
    min-width: 35%;
  }

  @include tablet {
    width: 8.25rem;
  }
}

.c-list-item-content {
  flex-grow: 1;
  min-width: 0;
}

.c-role-select-input {
  width: 100%;

  &::after {
    right: 0.75rem;
  }

  .select {
    height: 2rem;
    padding-left: 0.75rem;
    padding-right: 1.5rem;
    font-size: $size_4;
  }

  @include from($modal_narrow_point) {
    max-width: 12.75rem;
  }
}

.c-perimission-items-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.c-feedback-banner {
  margin-top: 0;
  margin-bottom: 2rem;
}

.c-button-container {
  margin-top: 2rem;
}
</style>
