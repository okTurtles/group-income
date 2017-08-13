<template>
  <section class="container section">
    <div class="columns">

      <div class="column is-2">
        <your-groups-list
          :currentGroupId="currentGroupId"
          :groups="groupsByName"
        />
      </div>

      <div class="column">
        <div class='is-pulled-right'>
          <groups-min-income :group="currentGroupState" />
        </div>

        <h1 class="title is-1">{{ groupsByName.groupName }}</h1>
        <p>{{ currentGroupState.sharedValues }}</p>

        <group-members :group="currentGroupState" />

        <group-support-history :history="[1.2, 1, .85, .95, 1.05, .35]" />

        <group-settings :group="currentGroupState" />

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
</style>
<script>
  import {mapGetters} from 'vuex'
  import YourGroupsList from '../components/YourGroupsList.vue'
  import GroupsMinIncome from '../components/GroupsMinIncome.vue'
  import GroupMembers from '../components/GroupMembers.vue'
  import GroupSupportHistory from '../components/GroupSupportHistory.vue'
  import GroupSettings from '../components/GroupSettings.vue'

  export default {
    name: 'GroupDashboard',
    computed: {
      ...mapGetters(['currentGroupId']),
      ...mapGetters(['currentGroupState']),
      ...mapGetters(['groupsByName'])
    },
    components: {
      YourGroupsList,
      GroupsMinIncome,
      GroupMembers,
      GroupSupportHistory,
      GroupSettings
    }
  }
</script>
