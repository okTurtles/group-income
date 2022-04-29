<template lang="pug">
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-if='groupSettings.groupName')
  template(#title='') {{ groupSettings.groupName }}

  banner-simple(severity='warning' class='c-banner' v-if='!hasIncomeDetails && isCloseToDistributionTime')
    p Next distribution date in on {{ humanDate(groupSettings.distributionDate, { month: 'long', day: 'numeric' })}}. Make sure to update your income details by then.

  add-income-details-widget(v-if='!hasIncomeDetails' :welcomeMessage='true')

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
import BannerSimple from '@components/banners/BannerSimple.vue'
// import GroupSettings from '@components/GroupSettings.vue'
import { addTimeToDate, DAYS_MILLIS, humanDate } from '~/frontend/utils/time.js'

export default ({
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
    },
    isCloseToDistributionTime () {
      const warningDate = addTimeToDate(new Date(this.groupSettings.distributionDate), -7 * DAYS_MILLIS)
      return Date.now() >= new Date(warningDate).getTime()
    }
  },
  methods: {
    humanDate
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
    GroupPurpose,
    BannerSimple
    // GroupSettings
  }
}: Object)
</script>

<style lang="scss" scoped>
.c-banner {
  margin-bottom: 1rem;
}
</style>
