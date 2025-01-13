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
        i18n.th-role(tag='th') Role
        i18n.th-permissions(tag='th') Permissions
        th.th-action(:aria-label='L("action")')

    tbody
      permission-table-row(
        v-for='entry in ephemeral.fakeRolesData'
        :key='entry.id'
        :data='entry'
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
  {
    id: 'fake-1',
    username: 'Fake user 1',
    role: GROUP_ROLES.ADMIN,
    permissions: GROUP_PERMISSIONS_PRESET[GROUP_ROLES.ADMIN]
  },
  {
    id: 'fake-2',
    username: 'Fake user 2',
    role: GROUP_ROLES.MODERATOR_DELEGATOR,
    permissions: GROUP_PERMISSIONS_PRESET[GROUP_ROLES.MODERATOR_DELEGATOR]
  },
  {
    id: 'fake-3',
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
        fakeRolesData
      }
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
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

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
    min-width: 12.25rem;
  }

  th.th-role {
    min-width: 7.25rem;
  }

  th.th-action {
    width: 5.25rem;
  }
}
</style>
