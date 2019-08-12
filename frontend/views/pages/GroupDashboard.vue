<template lang="pug">
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-if='currentGroupState')
  template(#title='') {{ currentGroupState.settings.groupName }}

  page-section(title='This months overview')
    overview

  page-section(title='Proposals')
    proposals(:proposals='currentGroupState.proposals')

  page-section(title='July Overview')
    //- group-pledges-graph
    progress-overview

  //- page-section(title='Support History')
  //-   support-history(:history='[1.2, 1, .85, .95, 1.05, .35]')

  //- page-section(title='Group Settings')
  //-   group-settings(:group='currentGroupState')

  template(#sidebar='')
    groups-min-income(:group='currentGroupState')
    group-members
    group-purpose
</template>

<script>
import { mapGetters, mapState } from 'vuex'

import Page from '@pages/Page.vue'
import PageSection from '@components/PageSection.vue'
import Overview from '@containers/Overview.vue'
import Proposals from '@containers/Proposals.vue'
// import GroupPledgesGraph from '@containers/GroupPledgesGraph.vue'
import ProgressOverview from '@components/ProgressOverview.vue'
// import SupportHistory from '@components/Graphs/SupportHistory.vue'
// import GroupSettings from '@components/GroupSettings.vue'
import GroupsMinIncome from '@containers/sidebar/GroupsMinIncome.vue'
import GroupMembers from '@containers/sidebar/GroupMembers.vue'
import GroupPurpose from '@containers/sidebar/GroupPurpose.vue'

export default {
  name: 'GroupDashboard',
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'currentGroupState',
      'groupsByName'
    ])
  },
  components: {
    Page,
    PageSection,
    Overview,
    Proposals,
    // GroupPledgesGraph
    ProgressOverview,
    // SupportHistory,
    // GroupSettings,
    GroupsMinIncome,
    GroupMembers,
    GroupPurpose
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";
</style>
