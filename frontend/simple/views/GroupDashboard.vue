<template>
  <section class="container section" data-test="dashboard">
    <div class="columns">

      <div class="column is-2">
        <your-groups-list
          :currentGroupId="currentGroupState.currentGroupId"
          :groups="groupsByName"
        />
      </div>

      <div class="column">
        <div class='is-pulled-right'>
          <groups-min-income :group="currentGroupState" />
        </div>

        <h1 class="title is-1" data-test="groupName">
          {{ currentGroupState.groupName }}
        </h1>
        <p data-test="sharedValues">
          {{ currentGroupState.sharedValues }}
        </p>

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
  </section>
</template>
<style lang="scss" scoped>
  h1.title {
    font-family: HelveticaNeue-Bold;
    font-size: 52px;
    color: #616161;
  }

  .widget {
    margin: 4rem 0;
  }

  .container {
    max-width: 960px; // force until rethink layout on larger screens
  }
</style>
<script>
  import {mapGetters} from 'vuex'
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
