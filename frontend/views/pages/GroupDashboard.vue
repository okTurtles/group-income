<template lang="pug">
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-if='groupSettings.groupName')
  template(#title='') {{ groupSettings.groupName }}

  welcome(v-if='groupIncomeDistribution.length === 0')

  start-inviting(v-if='groupMembersCount === 1')

  div(v-else)
    page-section(title='This months overview' v-if='!showHistory')
      span.support-history.button.is-outlined.is-small(@click='showHistory = !showHistory') Support history
      overview

    page-section(title='Support History' v-if='showHistory')
      span.support-history.button.is-outlined.is-small(@click='showHistory = !showHistory') This month's overview
      support-history

  proposals-widget

  //- page-section(title='July Overview')
  //-   progress-overview

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
import SupportHistory from '@components/Graphs/SupportHistory.vue'
// import GroupSettings from '@components/GroupSettings.vue'
import GroupMincome from '@containers/sidebar/GroupMincome.vue'
import GroupMembers from '@containers/sidebar/GroupMembers.vue'
import GroupPurpose from '@containers/sidebar/GroupPurpose.vue'
import Welcome from '@containers/Welcome.vue'

export default {
  name: 'GroupDashboard',
  data () {
    return {
      showHistory: false
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'currentGroupState', // TODO normalize getters names
      'groupSettings',
      'groupsByName',
      'groupMembersCount',
      'groupIncomeDistribution'
    ])
  },
  components: {
    Page,
    PageSection,
    Overview,
    ProposalsWidget,
    // GroupPledgesGraph
    ProgressOverview,
    SupportHistory,
    // GroupSettings,
    GroupMincome,
    GroupMembers,
    GroupPurpose,
    StartInviting,
    Welcome
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.card {
  position: relative;
}

.support-history {
  position: absolute;
  right: 2.5rem;
  top: 2.5rem;

  @include phone {
    display: none;
  }
}
</style>
