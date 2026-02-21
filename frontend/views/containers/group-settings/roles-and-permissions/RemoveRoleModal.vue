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
          member-name.c-list-item-content.c-member-details-container(:memberID='data.memberID')

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
import MemberName from './MemberName.vue'
import { CLOSE_MODAL, GROUP_PERMISSIONS_UPDATE_SUCCESS } from '@utils/events.js'
import { GROUP_PERMISSION_CHANGE_ACTIONS } from '@model/contracts/shared/constants.js'
import { getPermissionDisplayName } from './permissions-utils.js'
import { L } from '@common/common.js'

export default {
  name: 'RemoveRoleModal',
  components: {
    ModalTemplate,
    ButtonSubmit,
    AvatarUser,
    BannerScoped,
    RolePill,
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
      sbp('okTurtles.events/emit', CLOSE_MODAL, 'RemoveRoleModal')
    },
    async submit () {
      try {
        this.$refs.formMsg.clean()

        await sbp('gi.actions/group/updatePermissions', {
          contractID: this.$store.state.currentGroupId,
          data: [{
            memberID: this.data.memberID,
            action: GROUP_PERMISSION_CHANGE_ACTIONS.REMOVE
          }]
        })

        sbp('okTurtles.events/emit', GROUP_PERMISSIONS_UPDATE_SUCCESS, {
          groupContractID: this.$store.state.currentGroupId,
          action: 'remove'
        })
        this.close()
      } catch (e) {
        console.error('RemoveRoleModal.vue submit() caught error: ', e)
        this.$refs.formMsg.danger(e.message)
      }
    }
  },
  created () {
    if (!this.data?.memberID) {
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
    box-shadow: inset 0 -2px 0 $general_2;
  }

  &-content {
    position: relative;
    width: 100%;
  }
}

.c-member-details-container {
  max-width: calc(100% - 7rem);
}

.c-label {
  display: inline-block;
  font-size: $size_5;
  color: $text_1;
  text-transform: uppercase;
  width: 7rem;
  flex-shrink: 0;

  @include tablet {
    width: 8.25rem;
  }
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
