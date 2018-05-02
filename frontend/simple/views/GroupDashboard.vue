<template>
  <main data-test="dashboard">
    <div class="columns">
      <div class="column is-narrow gi-sidebar">
        <your-groups-list
          :currentGroupId="currentGroupId"
          :groups="groupsByName"
        />
      </div>

      <div class="column gi-main">
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

        <voting-banner class="widget"
          who="Sam"
          propose="changing"
          what="min income"
          change="$250"
          votesCount="3" />

        <group-members class="widget" />

        <progress-overview class="widget" />

        <support-history class="widget"
          :history="[1.2, 1, .85, .95, 1.05, .35]" />

        <group-settings class="widget"
          :group="currentGroupState" />
      </div>
    </div>
  </main>
</template>
<style lang="scss" scoped>
.widget {
  margin: 4rem 0;
}

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
import YourGroupsList from '../components/YourGroupsList.vue'
import GroupsMinIncome from '../components/GroupsMinIncome.vue'
import GroupMembers from '../components/GroupMembers.vue'
import SupportHistory from '../components/SupportHistory.vue'
import GroupSettings from '../components/GroupSettings.vue'
import VotingBanner from '../components/VotingBanner.vue'
import ProgressOverview from '../components/ProgressOverview.vue'

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
    GroupMembers,
    SupportHistory,
    GroupSettings,
    VotingBanner,
    ProgressOverview
  }
}
</script>
