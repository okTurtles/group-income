<template lang='pug'>
  modal-template.has-background(
    ref='modal'
    :a11yTitle='config.title'
  )
    template(slot='title')
      span {{ config.title }}

    form.c-form(v-if='data' @submit.prevent='')
      i18n.label(tag='p') Edit permissions for:

      .c-member-details
        avatar-user.c-avatar(:contractID='data.memberID' size='md')
        .c-member-info
          .c-display-name.has-text-bold {{ userDisplayNameFromID(data.memberID) }}
          .c-username.has-text-1 @{{ usernameFromID(data.memberID) }}

      ul.c-update-table
        li.c-table-list-item
          label.c-label Role:
          .selectbox.c-role-select-input
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

      .buttons.c-button-container
        i18n.is-outlined(
          tag='button'
          @click.prevent='close'
        ) Cancel

        button-submit.is-success(@click='submit') Update
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import AvatarUser from '@components/AvatarUser.vue'
import { GROUP_ROLES } from '@model/contracts/shared/constants.js'
import { CLOSE_MODAL } from '@utils/events.js'
import { getRoleDisplayName } from './permissions-utils.js'
import { L } from '@common/common.js'

export default {
  name: 'EditPermissionsModal',
  components: {
    ModalTemplate,
    ButtonSubmit,
    AvatarUser
  },
  props: {
    data: {
      // { roleName: string, permissions: string[], memberID: string }
      type: Object
    }
  },
  computed: {
    ...mapGetters([
      'userDisplayNameFromID',
      'usernameFromID'
    ])
  },
  data () {
    return {
      config: {
        title: L('Edit member permissions'),
        roles: [
          GROUP_ROLES.MODERATOR_DELEGATOR,
          GROUP_ROLES.MODERATOR,
          GROUP_ROLES.CUSTOM
        ]
      },
      ephemeral: {
        role: null,
        permissions: []
      }
    }
  },
  methods: {
    getRoleDisplayName,
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL, 'EditPermissionsModal')
    },
    submit () {
      try {
        console.log('TODO!', this.data)
      } catch (e) {
        console.error('EditPermissionsModal.vue submit() caught error: ', e)
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
        console.log('TODO!: populate permissions with current data if there is')
      }
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

.c-update-table {
  position: relative;
  width: 100%;
  margin-top: 1.25rem;

  @include tablet {
    margin-top: 1.5rem;
  }
}

.c-member-details {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  margin-top: 0.75rem;

  .c-avatar {
    margin-bottom: 0.5rem;
  }

  .c-display-name,
  .c-username {
    word-break: break-word;
    line-height: 1.2;
    text-align: center;
  }

  .c-username {
    font-size: $size_5;
  }
}

.c-update-table {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  padding: 1rem 0;
  border-top: 1px solid $general_0;
  border-bottom: 1px solid $general_0;

  .c-table-list-item {
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    width: 100%;
    padding: 1rem 0;
    column-gap: 0.5rem;

    &:not(:last-child) {
      border-bottom: 1px solid $general_0;
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
  width: 7rem;
  flex-shrink: 0;
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
</style>
