<template lang="pug">
page-section.c-section(
  v-if='isGroupCreator'
  :title='L("Roles and Permissions")'
)
  i18n.has-text-1.c-section-description(tag='p') Here's a list of roles and permissions granted to your group members.

  banner-scoped(ref='feedbackMsg' :allowA='true')

  table.table.table-in-card.c-permissions-table
    thead
      tr
        i18n.th-user(tag='th') User
        // Role and permissions columns are combined when the screen does not have enough space.
        i18n.th-role-and-permissions-combined(
          v-if='ephemeral.isMobile'
          tag='th'
        ) Roles / Permissions
        template(v-else)
          i18n.th-role(tag='th') Role
          i18n.th-permissions(tag='th') Permissions
        th.th-action(:aria-label='L("action")')

    tbody
      permission-table-row(
        v-for='entry in ephemeral.fakeRolesData'
        :key='entry.id'
        :data='entry'
        :is-mobile='ephemeral.isMobile'
      )

  .c-buttons-container
    button.is-small.is-outlined(
      type='button'
      @click='handleAddPermissionsClick'
    )
      i18n Add Permissions
</template>

<script>
import { mapGetters } from 'vuex'
import PageSection from '@components/PageSection.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import PermissionTableRow from './PermissionTableRow.vue'
import { GROUP_ROLES, GROUP_PERMISSIONS_PRESET } from '@model/contracts/shared/constants.js'
import { L } from '@common/common.js'

const fakeRolesData = [
  // NOTE: This is a fake user data created for development purpose.
  //       Should be removed once the roles & permissions features are implemented in the contract.
  {
    id: 'user-1',
    username: 'Fake user 1',
    role: GROUP_ROLES.ADMIN,
    permissions: GROUP_PERMISSIONS_PRESET[GROUP_ROLES.ADMIN]
  },
  {
    id: 'user-2',
    username: 'Fake user 2',
    role: GROUP_ROLES.MODERATOR_DELEGATOR,
    permissions: GROUP_PERMISSIONS_PRESET[GROUP_ROLES.MODERATOR_DELEGATOR]
  },
  {
    id: 'user-3',
    username: 'Fake user 3',
    role: GROUP_ROLES.MODERATOR,
    permissions: GROUP_PERMISSIONS_PRESET[GROUP_ROLES.MODERATOR]
  }
]

export default ({
  name: 'RolesAndPermissions',
  components: {
    PageSection,
    BannerScoped,
    PermissionTableRow
  },
  data () {
    return {
      ephemeral: {
        fakeRolesData,
        isMobile: false
      },
      matchMediaMobile: null
    }
  },
  computed: {
    ...mapGetters([
      'ourIdentityContractId',
      'currentGroupOwnerID'
    ]),
    isGroupCreator () {
      return this.ourIdentityContractId === this.currentGroupOwnerID
    }
  },
  methods: {
    handleAddPermissionsClick () {
      alert(L('Coming soon!'))
    }
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
