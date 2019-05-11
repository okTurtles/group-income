<template>
  <main data-test="dashboard" v-if="currentGroupState">
    <div class="section gi-header">
      <div class='is-pulled-right'>
        <groups-min-income :group="currentGroupState" />
      </div>

      <h1 class="title is-1 is-marginless" data-test="groupName">
        {{ currentGroupState.groupName }}
      </h1>
    </div>

    <dashboard-section title="Proposals">
      <proposals :proposals="currentGroupState.proposals" />
    </dashboard-section>

    <dashboard-section title="Members" data-test="groupMembers">
      <group-members />
    </dashboard-section>

    <dashboard-section title="July Overview">
      <!-- <group-pledges-graph /> -->
      <progress-overview />
    </dashboard-section>

    <dashboard-section title="Support History">
      <support-history :history="[1.2, 1, .85, .95, 1.05, .35]" />
    </dashboard-section>

    <dashboard-section title="Group Settings">
      <group-settings :group="currentGroupState" />
    </dashboard-section>
  </main>
</template>
<script>
import { mapGetters, mapState } from 'vuex'

import DashboardSection from './components/DashboardSection.vue'
import GroupsMinIncome from './components/GroupsMinIncome.vue'
import Proposals from './containers/Proposals.vue'
import GroupMembers from './containers/GroupMembers.vue'
import SupportHistory from './components/Graphs/SupportHistory.vue'
import GroupSettings from './components/GroupSettings.vue'
import ProgressOverview from './components/ProgressOverview.vue'
// import GroupPledgesGraph from './containers/GroupPledgesGraph.vue'

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
    DashboardSection,
    GroupsMinIncome,
    Proposals,
    GroupMembers,
    SupportHistory,
    GroupSettings,
    ProgressOverview
    // GroupPledgesGraph // TODO - user can personalize what graph to display
  }
}
</script>
