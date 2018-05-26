<template>
  <main data-test="dashboard">
    <div class="columns">
      <div class="column is-narrow gi-sidebar">
        <your-groups-list
          :currentGroupId="currentGroupId"
          :groups="groupsByName"
        />
      </div>

      <div class="column container gi-main">
        <div class="gi-header">
          <div class='is-pulled-right'>
            <groups-min-income :group="currentGroupState" />
          </div>

          <h1 class="title is-1" data-test="groupName">
            {{ currentGroupState.groupName }}
          </h1>
          <p data-test="sharedValues">
            {{ currentGroupState.sharedValues }}
          </p>
        </div>

        <proposals :proposals="currentGroupState.proposals" />

        <group-members />

        <progress-overview />

        <support-history :history="[1.2, 1, .85, .95, 1.05, .35]" />

        <group-settings :group="currentGroupState" />
      </div>
    </div>
  </main>
</template>
<style lang="scss" scoped>
.gi-sidebar {
  width: 15rem;
  padding-right: 0;
}

.gi-main {
  padding-right: calc(2rem + 0.75rem);
  padding-left: 2rem;
  max-width: 960px;
}

.gi-header {
  padding-top: 1.5rem;
}
</style>
<script>
import { mapGetters, mapState } from 'vuex'

import YourGroupsList from './containers/YourGroupsList.vue'
import GroupsMinIncome from './components/GroupsMinIncome.vue'
import Proposals from './containers/Proposals.vue'
import GroupMembers from './containers/GroupMembers.vue'
import SupportHistory from './components/Graphs/SupportHistory.vue'
import GroupSettings from './components/GroupSettings.vue'
import ProgressOverview from './components/ProgressOverview.vue'

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
    YourGroupsList,
    GroupsMinIncome,
    Proposals,
    GroupMembers,
    SupportHistory,
    GroupSettings,
    ProgressOverview
  }
}
</script>
