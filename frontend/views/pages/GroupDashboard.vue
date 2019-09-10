<template lang="pug">
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-if='groupSettings.groupName')
  template(#title='') {{ groupSettings.groupName }}

  start-inviting(v-if='groupMembersCount === 1')

  page-section(title='This months overview')
    overview

  page-section(title='Proposals')
    proposals

  page-section(title='July Overview')
    //- group-pledges-graph
    progress-overview

  //- page-section(title='Support History')
  //-   support-history

  //- page-section(title='Group Settings')
  //-   group-settings

  template(#sidebar='')
    groups-min-income
    group-members(v-if='groupMembersCount > 1')
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
import StartInviting from '@components/StartInviting.vue'
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
      'groupSettings',
      'groupsByName',
      'groupMembersCount'
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
    GroupPurpose,
    StartInviting
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";
</style>
