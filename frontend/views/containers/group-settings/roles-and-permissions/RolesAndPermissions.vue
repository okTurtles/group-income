<template lang="pug">
page-section.c-section(
  v-if='isGroupCreator'
  :title='L("Roles and Permissions")'
)
  i18n.has-text-1.c-section-description(tag='p') Here's a list of roles and permissions

  banner-scoped(ref='feedbackMsg' allowA='true')

  table.table.table-in-card.c-table
    thead
      tr
        i18n.th-name(tag='th') User
        i18n.th-role(tag='th') Role
        i18n.th-permissions(tag='th') Permissions
        th.c-action(:aria-label='L("action")')

    tbody
      tr
        td.c-name username
</template>

<script>
import { mapGetters } from 'vuex'
import PageSection from '@components/PageSection.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'

export default ({
  name: 'RolesAndPermissions',
  components: {
    PageSection,
    BannerScoped
  },
  computed: {
    ...mapGetters([
      'ourIdentityContractId',
      'currentGroupOwnerID'
    ]),
    isGroupCreator () {
      return this.ourIdentityContractId === this.currentGroupOwnerID
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
</style>
