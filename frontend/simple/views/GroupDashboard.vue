<script>
import YourGroupsList from '../components/YourGroupsList.vue'
import GroupsMinIncome from '../components/GroupsMinIncome.vue'
import GroupMembers from '../components/GroupMembers.vue'
import GroupSupportHistory from '../components/GroupSupportHistory.vue'
import GroupSettings from '../components/GroupSettings.vue'

export default {
  name: 'GroupDashboard',
  computed: {
    currentGroupId () {
      return this.$store.state.currentGroupId
    },
    group () {
      return this.$store.getters.currentGroup
    },
    groups () {
      return this.$store.getters.groupsByName
    }
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

<template>
  <section class="container section">
    <div class="columns">

      <div class="column is-2">
        <your-groups-list
          :currentGroupId="currentGroupId"
          :groups="groups"
        />
      </div>

      <div class="column">
        <div class='is-pulled-right'>
          <groups-min-income :group="group" />
        </div>

        <h1 class="title is-1">{{ group.groupName }}</h1>
        <p>{{ group.sharedValues }}</p>

        <group-members :group="group" />

        <group-support-history />

        <group-settings :group="group" />

      </div>
    </div>
  </section>
</template>

<style lang="sass" scoped>
  h1.title
    font-family: HelveticaNeue-Bold
    font-size: 52px
    color: #616161
</style>
