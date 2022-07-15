<template lang="pug">
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-if='groupSettings.groupName')
  template(#title='') {{ groupSettings.groupName }}

  banner-simple(severity='warning' class='c-banner' v-if='showBanner')
    i18n(
      @click='handleIncomeClick'
      :args='{ \
        r1: `<button class="link js-btnInvite" data-test="openWarningIncomeDetailsModal">`, \
        r2: "</button>", \
        date: humanDate(groupSettings.distributionDate, { month: "long", day: "numeric" }) \
      }'
    ) Next distribution date is on {date}. Make sure to update your {r1}income details{r2} by then.

    button.is-unstyled(@click='closeBanner')
      i.icon-times

  add-income-details-widget(v-if='!hasIncomeDetails' :welcomeMessage='true')

  template(v-else)
    start-inviting-widget(v-if='groupMembersCount === 1')

    contributions-overview-widget(v-if='canDisplayGraph')

    contributions-summary-widget

  proposals-widget(v-if='hasProposals')

  member-request(v-if='hasMemberRequest')

  //- page-section(title='Group Settings')
  //-   group-settings-widget

  template(#sidebar='')
    group-mincome
    group-members
    group-purpose
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters, mapState } from 'vuex'
import { OPEN_MODAL, INCOME_DETAILS_UPDATE } from '@utils/events.js'
import Page from '@components/Page.vue'
import AddIncomeDetailsWidget from '@containers/contributions/AddIncomeDetailsWidget.vue'
import StartInvitingWidget from '@containers/dashboard/StartInvitingWidget.vue'
import ContributionsOverviewWidget from '@containers/contributions/ContributionsOverviewWidget.vue'
import ContributionsSummaryWidget from '@containers/contributions/ContributionsWidget.vue'
import ProposalsWidget from '@containers/proposals/ProposalsWidget.vue'
import MemberRequest from '@containers/proposals/MemberRequest.vue'
import GroupMincome from '@containers/dashboard/GroupMincome.vue'
import GroupMembers from '@containers/dashboard/GroupMembers.vue'
import GroupPurpose from '@containers/dashboard/GroupPurpose.vue'
import BannerSimple from '@components/banners/BannerSimple.vue'
// import GroupSettings from '@components/GroupSettings.vue'
import { addTimeToDate, DAYS_MILLIS, humanDate } from '@model/contracts/shared/time.js'

export default ({
  name: 'GroupDashboard',
  beforeMount () {
    sbp('okTurtles.events/on', INCOME_DETAILS_UPDATE, this.closeBanner)

    if (!this.isCloseToDistributionTime) {
      localStorage.setItem(this.bannerStorageKey, false)
    }

    this.updateBannerVisibility()
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', INCOME_DETAILS_UPDATE, this.closeBanner)
  },
  data () {
    return {
      ephemeral: {
        hideBanner: false
      }
    }
  },
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
      const dDay = new Date(this.groupSettings.distributionDate)
      const warningDate = addTimeToDate(dDay, -7 * DAYS_MILLIS)

      // when (D-day - 7d) <= today < D-day
      return Date.now() >= new Date(warningDate).getTime() && Date.now() < dDay.getTime()
    },
    bannerStorageKey () {
      return `giHideDistributionWarning.${this.currentGroupId}`
    },
    showBanner () {
      return this.isCloseToDistributionTime && !this.ephemeral.hideBanner
    },
    hasMemberRequest () {
      return this.requests
    }
  },
  methods: {
    humanDate,
    handleIncomeClick (e) {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'IncomeDetails')
    },
    closeBanner () {
      localStorage.setItem(this.bannerStorageKey, true)
      this.ephemeral.hideBanner = true
    },
    updateBannerVisibility () {
      this.ephemeral.hideBanner = localStorage.getItem(this.bannerStorageKey) === 'true'
    }
  },
  watch: {
    bannerStorageKey () {
      // if the user performs switching to another group while he/she is still in this page[GroupDashboard.vue],
      // check if the distribution-warning banner has been dismissed for the switched group again.
      this.updateBannerVisibility()
    }
  },
  components: {
    Page,
    AddIncomeDetailsWidget,
    StartInvitingWidget,
    ContributionsOverviewWidget,
    ContributionsSummaryWidget,
    ProposalsWidget,
    MemberRequest,
    GroupMincome,
    GroupMembers,
    GroupPurpose,
    BannerSimple
    // GroupSettings
  }
}: Object)
</script>

<style lang="scss" scoped>
.c-banner.c-message {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;

  button {
    float: right;
    margin-left: 0.5rem;
    margin-top: 0.2rem;
  }

  ::v-deep .c-body {
    display: flex;
    align-content: center;
    justify-content: space-between;
  }
}
</style>
