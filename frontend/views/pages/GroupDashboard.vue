<template lang="pug">
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-if='groupSettings.groupName')
  template(#title='') {{ groupSettings.groupName }}

  welcome(v-if='!ourGroupProfile.incomeDetailsType')

  div(v-else)

    start-inviting(v-if='groupMembersCount === 1')

    graph-widget(v-if='canDisplayGraph')

    proposals-widget

    //- page-section(title='L("July Overview")')
    //-   progress-overview

    //- page-section(title='L("Group Settings")')
    //-   group-settings

  template(#sidebar='')
    group-mincome
    group-members
    group-purpose
</template>

<script>
import { mapGetters, mapState } from 'vuex'

import Page from '@pages/Page.vue'
import ProposalsWidget from '@containers/proposals/ProposalsWidget.vue'
import ProgressOverview from '@components/ProgressOverview.vue'
import StartInviting from '@components/StartInviting.vue'
import GraphWidget from '@components/Graphs/GraphWidget.vue'
import GroupMincome from '@containers/sidebar/GroupMincome.vue'
import GroupMembers from '@containers/sidebar/GroupMembers.vue'
import GroupPurpose from '@containers/sidebar/GroupPurpose.vue'
import Welcome from '@containers/Welcome.vue'
// import GroupPledgesGraph from '@containers/GroupPledgesGraph.vue'
// import GroupSettings from '@components/GroupSettings.vue'

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
      'groupMembersCount',
      'groupProfiles',
      'ourGroupProfile'
    ]),
    canDisplayGraph () {
      return Object.values(this.groupProfiles).filter(profile => profile.incomeDetailsType).length > 0
    }
  },
  components: {
    Page,
    ProposalsWidget,
    GraphWidget,
    ProgressOverview,
    GroupMincome,
    GroupMembers,
    GroupPurpose,
    StartInviting,
    Welcome
    // GroupSettings,
    // GroupPledgesGraph
  }
}
</script>
