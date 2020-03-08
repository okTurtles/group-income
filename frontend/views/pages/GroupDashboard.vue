<template lang="pug">
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-if='groupSettings.groupName')
  template(#title='') {{ groupSettings.groupName }}

  add-income-details-widget(v-if='!hasIncomeDetails')

  template(v-else)
    start-inviting-widget(v-if='groupMembersCount === 1')

    contributions-overview-widget(v-if='canDisplayGraph')

    contributions-summary-widget

  proposals-widget(v-if='hasProposals')

  //- page-section(title='Group Settings')
  //-   group-settings-widget

  template(#sidebar='')
    group-mincome
    group-members
    group-purpose
</template>

<script>
import { mapGetters, mapState } from 'vuex'

import Page from '@components/Page.vue'
import AddIncomeDetailsWidget from '@containers/contributions/AddIncomeDetailsWidget.vue'
import StartInvitingWidget from '@containers/dashboard/StartInvitingWidget.vue'
import ContributionsOverviewWidget from '@containers/contributions/ContributionsOverviewWidget.vue'
import ContributionsSummaryWidget from '@containers/contributions/ContributionsWidget.vue'
import ProposalsWidget from '@containers/proposals/ProposalsWidget.vue'
import GroupMincome from '@containers/dashboard/GroupMincome.vue'
import GroupMembers from '@containers/dashboard/GroupMembers.vue'
import GroupPurpose from '@containers/dashboard/GroupPurpose.vue'
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
    AddIncomeDetailsWidget,
    StartInvitingWidget,
    ContributionsOverviewWidget,
    ContributionsSummaryWidget,
    ProposalsWidget,
    GroupMincome,
    GroupMembers,
    GroupPurpose
    // GroupSettings
  }
}
</script>
