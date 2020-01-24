<template lang="pug">
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-if='groupSettings.groupName')
  template(#title='') {{ groupSettings.groupName }}

  add-income-details-widget(v-if='!hasIncomeDetails')

  div(v-else)
    start-inviting(v-if='groupMembersCount === 1')

    contributions-overview(v-if='canDisplayGraph')

    contributions-widget

  proposals-widget(v-if='hasProposals')

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
import ContributionsOverview from '@containers/contributions/ContributionsOverview.vue'
import GroupMincome from '@containers/sidebar/GroupMincome.vue'
import GroupMembers from '@containers/sidebar/GroupMembers.vue'
import GroupPurpose from '@containers/sidebar/GroupPurpose.vue'
import AddIncomeDetailsWidget from '@containers/AddIncomeDetailsWidget.vue'
// import GroupPledgesGraph from '@containers/GroupPledgesGraph.vue'
// import GroupSettings from '@components/GroupSettings.vue'

export default {
  name: 'GroupDashboard',
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'ourUsername',
      'currentGroupState', // TODO normalize getters names
      'groupSettings',
      'groupsByName',
      'groupMembersCount',
      'groupProfiles',
      'ourGroupProfile'
    ]),
    canDisplayGraph () {
      return Object.values(this.groupProfiles).filter(profile => profile.incomeDetailsType).length > 0
    },
    hasIncomeDetails () {
      return !!this.ourGroupProfile.incomeDetailsType
    },
    hasProposals () {
      return Object.keys(this.currentGroupState.proposals).length > 0
    }
  },
  components: {
    Page,
    ProposalsWidget,
    ContributionsOverview,
    ProgressOverview,
    GroupMincome,
    GroupMembers,
    GroupPurpose,
    StartInviting,
    AddIncomeDetailsWidget
    // GroupSettings,
    // GroupPledgesGraph
  }
}
</script>
