<template lang="pug">
page-section.c-section(
  :title='L("Roles and Permissions")'
)
  p.has-text-1.c-section-description
    i18n(v-if='canViewOtherMembersPermissions') Here's a list of roles and permissions granted to your group members.
    i18n(v-else) Below is the role and permissions granted to you.

  table.table.table-in-card.c-permissions-table
    thead
      tr
        // User and role columns are combined when the screen is not wide enough.
        i18n.th-user-and-role-combined(v-if='ephemeral.isMobile' tag='th') User / Role
        template(v-else)
          i18n.th-user(tag='th') User
          i18n.th-role(tag='th') Role
        i18n.th-permissions(tag='th') Permissions
        th.th-action(v-if='canDelegatePermissions' :aria-label='L("action")')

    tbody
      permission-table-row(
        v-for='entry in groupPermissionsToDisplay'
        :key='entry.memberID'
        :data='entry'
        :is-mobile='ephemeral.isMobile'
      )

  banner-scoped.c-feedback-banner(ref='formMsg' allow-a)

  .c-buttons-container(v-if='canDelegatePermissions')
    button.is-small.is-outlined(
      type='button'
      @click='handleAddPermissionsClick'
    )
      i18n Add Permissions
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { L } from '@common/common.js'
import PageSection from '@components/PageSection.vue'
import PermissionTableRow from './PermissionTableRow.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import { OPEN_MODAL, GROUP_PERMISSIONS_UPDATE_SUCCESS } from '@utils/events.js'
import { GROUP_PERMISSIONS } from '@model/contracts/shared/constants.js'

export default ({
  name: 'RolesAndPermissions',
  components: {
    PageSection,
    PermissionTableRow,
    BannerScoped
  },
  data () {
    return {
      ephemeral: {
        isMobile: false
      },
      matchMediaMobile: null
    }
  },
  computed: {
    ...mapGetters([
      'ourGroupPermissionsHas',
      'allGroupMemberRolesAndPermissions',
      'ourIdentityContractId'
    ]),
    canDelegatePermissions () {
      return this.ourGroupPermissionsHas(GROUP_PERMISSIONS.DELEGATE_PERMISSIONS)
    },
    canViewOtherMembersPermissions () {
      return this.ourGroupPermissionsHas(GROUP_PERMISSIONS.VIEW_PERMISSIONS)
    },
    groupPermissionsToDisplay () {
      const myEntry = this.allGroupMemberRolesAndPermissions.find(entry => entry.memberID === this.ourIdentityContractId)
      const otherEntries = this.allGroupMemberRolesAndPermissions.filter(entry => entry.memberID !== this.ourIdentityContractId)
      const sortedEntries = myEntry ? [myEntry, ...otherEntries] : this.allGroupMemberRolesAndPermissions
      return this.canViewOtherMembersPermissions
        ? sortedEntries
        : (myEntry ? [myEntry] : [])
    }
  },
  methods: {
    handleAddPermissionsClick () {
      this.openModal('AddPermissionsModal')
    },
    openModal (modal, queries) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, queries)
    },
    onGroupPermissionsUpdateSuccess ({ groupContractID, action }) {
      if (groupContractID !== this.$store.state.currentGroupId) { return }

      const messageMap = {
        'add': L('Successfully added a role.'),
        'update': L('Successfully updated a role.'),
        'remove': L('Successfully removed a role.')
      }
      this.$refs.formMsg.success(messageMap[action])
    }
  },
  created () {
    sbp('okTurtles.events/on', GROUP_PERMISSIONS_UPDATE_SUCCESS, this.onGroupPermissionsUpdateSuccess)
  },
  mounted () {
    this.matchMediaMobile = window.matchMedia('screen and (max-width: 570px)')
    this.ephemeral.isMobile = this.matchMediaMobile.matches
    this.matchMediaMobile.onchange = (e) => {
      this.ephemeral.isMobile = e.matches
    }
  },
  beforeDestroy () {
    this.matchMediaMobile.onchange = null
    sbp('okTurtles.events/off', GROUP_PERMISSIONS_UPDATE_SUCCESS, this.onGroupPermissionsUpdateSuccess)
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

@mixin component-non-mobile {
  @media screen and (min-width: 571px) {
    @content;
  }
}

.c-section {
  position: relative;
}

.c-section-description {
  margin: 0.5rem 0;
}

.c-table {
  table-layout: fixed;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

.c-buttons-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.c-permissions-table {
  margin-top: 2rem;

  th.th-user {
    padding-right: 0.5rem;
  }

  th.th-role {
    min-width: 7.25rem;
  }

  th.th-action {
    width: 2.75rem;
    padding-right: 1rem;
  }

  @include component-non-mobile {
    th.th-user {
      width: auto;
      min-width: 12.25rem;
    }

    th.th-action {
      width: 4.25rem;
    }
  }
}
</style>
