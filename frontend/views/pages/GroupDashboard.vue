<template lang="pug">
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-if='groupSettings.groupName')
  template(#title='') {{ groupSettings.groupName }}

  start-inviting(v-if='groupMembersCount === 1')

  page-section(title='This months overview')
    overview

  page-section(title='July Overview')
    //- group-pledges-graph
    progress-overview

  proposals-widget

  //- page-section(title='Support History')
  //-   support-history

  //- page-section(title='Group Settings')
  //-   group-settings

  template(#sidebar='')
    group-mincome
    group-members
    group-purpose
</template>

<script>
import { mapGetters, mapState } from 'vuex'

import Page from '@pages/Page.vue'
import PageSection from '@components/PageSection.vue'
import Overview from '@containers/Overview.vue'
import ProposalsWidget from '@containers/proposals/ProposalsWidget.vue'
// import GroupPledgesGraph from '@containers/GroupPledgesGraph.vue'
import ProgressOverview from '@components/ProgressOverview.vue'
import StartInviting from '@components/StartInviting.vue'
// import SupportHistory from '@components/Graphs/SupportHistory.vue'
// import GroupSettings from '@components/GroupSettings.vue'
import GroupMincome from '@containers/sidebar/GroupMincome.vue'
import GroupMembers from '@containers/sidebar/GroupMembers.vue'
import GroupPurpose from '@containers/sidebar/GroupPurpose.vue'

export default {
  name: 'GroupDashboard',
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'currentGroupState', // TODO normalize getters names
      'groupSettings',
      'groupsByName',
      'groupMembersCount'
    ])
  },
  components: {
    Page,
    PageSection,
    Overview,
    ProposalsWidget,
    // GroupPledgesGraph
    ProgressOverview,
    // SupportHistory,
    // GroupSettings,
    GroupMincome,
    GroupMembers,
    GroupPurpose,
    StartInviting
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
