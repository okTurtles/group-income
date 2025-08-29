<template lang='pug'>
  modal-template.has-background(
    ref='modal'
    :a11yTitle='config.title'
  )
    template(slot='title')
      span {{ config.title }}

    form.c-form(@submit.prevent='')
      i18n.is-title-4(tag='h3') Are you sure you want to delete this member's role?

      ul.c-details-list(v-if='data')
        li.c-list-item
          i18n.c-label(tag='span') Member:
          .c-list-item-content.c-member-details-container
            avatar-user.c-avatar(:contractID='data.memberID' size='sm')
            .c-member-details
              .c-member-display-name.has-ellipsis {{ userDisplayNameFromID(data.memberID) }}
              .c-member-username.has-ellipsis @{{ usernameFromID(data.memberID) }}

          li.c-list-item
            i18n.c-label(tag='span') Role:
            .c-list-item-content
              role-pill(:role='data.roleName')

        li.c-list-item
          i18n.c-label(tag='span') Permissions:
          ul.c-list-item-content.c-permissions-list
            li.c-permission-pill(v-for='permission in data.permissions' :key='permission') - {{ getPermissionDisplayName(permission) }}

      banner-scoped.c-feedback-banner(ref='formMsg' allow-a)

      .buttons.c-button-container
        i18n.is-outlined(
          tag='button'
          @click.prevent='close'
        ) Cancel

        button-submit.is-danger(@click='submit') Remove
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import AvatarUser from '@components/AvatarUser.vue'
import RolePill from './RolePill.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import { CLOSE_MODAL } from '@utils/events.js'
import { GROUP_PERMISSION_UPDATE_ACTIONS } from '@model/contracts/shared/constants.js'
import { getPermissionDisplayName } from './permissions-utils.js'
import { L } from '@common/common.js'

export default {
  name: 'RemovePermissionsModal',
  components: {
    ModalTemplate,
    ButtonSubmit,
    AvatarUser,
    BannerScoped,
    RolePill
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
        title: L('Remove role')
      }
    }
  },
  computed: {
    ...mapGetters([
      'userDisplayNameFromID',
      'usernameFromID'
    ])
  },
  methods: {
    getPermissionDisplayName,
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL, 'RemovePermissionsModal')
    },
    async submit () {
      try {
        this.$refs.formMsg.clean()

        await sbp('gi.actions/group/updatePermissions', {
          contractID: this.$store.state.currentGroupId,
          data: [{
            memberID: this.data.memberID,
            action: GROUP_PERMISSION_UPDATE_ACTIONS.REMOVE
          }]
        })
        this.close()
      } catch (e) {
        console.error('RemovePermissionsModal.vue submit() caught error: ', e)
        this.$refs.formMsg.danger(e.message)
      }
    }
  },
  created () {
    if (!this.data) {
      this.close()
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-details-list {
  position: relative;
  width: 100%;
  margin-top: 1.25rem;

  @include tablet {
    margin-top: 1.5rem;
  }
}

.c-list-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  padding: 1rem 0;

  &:not(:last-child) {
    border-bottom: 1px solid $general_0;
  }

  &-content {
    position: relative;
    width: 100%;
  }
}

.c-member-details-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 0.5rem;
  width: 100%;
  max-width: calc(100% - 7rem);

  .c-avatar {
    flex-shrink: 0;
  }

  .c-member-details {
    position: relative;
    display: block;
    flex-grow: 1;
    max-width: calc(100% - 3rem);
    line-height: 1.2;

    .c-member-display-name {
      position: relative;
      font-weight: 600;
    }

    .c-member-username {
      position: relative;
      font-size: $size_5;
      color: $text_1;
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

.c-permissions-list {
  display: flex;
  flex-wrap: wrap;
  column-gap: 0.5rem;
  row-gap: 0.5rem;
  width: 100%;
}

.c-permission-pill {
  position: relative;
  display: inline-block;
  padding: 0.275rem 0.5rem 0.25rem;
  border-radius: $radius;
  font-size: $size_4;
  background-color: $general_1;
  color: $text_0;
}

.c-feedback-banner {
  margin-top: 0;
  margin-bottom: 2rem;
}

.c-button-container {
  margin-top: 1.5rem;
}
</style>
