<template lang='pug'>
.c-wrapper
  .c-columns
    .c-column
      i18n.is-title-3(tag='h2') Streaks
      i18n.has-text-1.c-para Information about your pledges streaks and other streak members appears here.

      ul.spacer
        li.c-item-wrapper
          .c-item
            .icon-star.icon-round.has-background-success.has-text-success
            .c-item-copy(v-safe-html='groupStreaksSentences.fullMonthlyPledges')

        li.c-item.wrapper
          .c-item
            .icon-star.icon-round.has-background-success.has-text-success
            .c-item-copy(v-safe-html='groupStreaksSentences.fullMonthlySupport')

        li.c-item-wrapper
          .c-item
            .icon-star.icon-round.has-background-success.has-text-success
            .c-item-copy
              //- Todo: discuss if tooltip better than toggle
              sentence-with-member-tooltip(:members='onTimePayments')
                .member-count-sentence(v-safe-html='memberCountSentences["onTimePayments"]')

    .c-column
      i18n.is-title-3(tag='h2') Inactivity
      .has-text-1.c-para Members that haven’t logged in, missed their pledges or haven´t voted last proposals will appear here.

      ul.spacer
        li.c-item-wrapper
          .c-item
            .icon-user.icon-round.has-background-general
            .c-item-copy
              sentence-with-member-tooltip(:members='haventLoggedIn')
                .member-count-sentence(v-safe-html='memberCountSentences["haventLoggedIn"]')

        li.c-item-wrapper
          .c-item
            .icon-comment-dollar.icon-round.has-background-general
            .c-item-copy
              sentence-with-member-tooltip(:members='noIncomeDetails')
                .member-count-sentence(v-safe-html='memberCountSentences["noIncomeDetails"]')

        li.c-item-wrapper
          .c-item
            .icon-dollar-sign.icon-round.has-background-general
            .c-item-copy
              sentence-with-member-tooltip(:members='missedPayments')
                .member-count-sentence(v-safe-html='memberCountSentences["missedPayments"]')

        li.c-item-wrapper
          .c-item
            .icon-vote-yea.icon-round.has-background-general
            .c-item-copy
              sentence-with-member-tooltip(:members='noVotes')
                .member-count-sentence(v-safe-html='memberCountSentences["noVotes"]')

</template>

<script>
import { mapGetters } from 'vuex'
import SentenceWithMemberTooltip from './SentenceWithMemberTooltip.vue'
import { compareISOTimestamps, DAYS_MILLIS } from '@model/contracts/shared/time.js'
import { STREAK_MISSED_PROPSAL_VOTE, STREAK_NOT_LOGGED_IN_DAYS, STREAK_ON_TIME_PAYMENTS, STREAK_MISSED_PAYMENTS } from '@model/contracts/shared/constants.js'
import { L, LTags } from '@common/common.js'

export default ({
  name: 'GroupMembersActivity',
  components: {
    SentenceWithMemberTooltip
  },
  data () {
    return {
      isReady: false,
      history: [],
      config: {
        proposalNumber: STREAK_MISSED_PROPSAL_VOTE,
        notLoggedInDays: STREAK_NOT_LOGGED_IN_DAYS
      }
    }
  },
  computed: {
    ...mapGetters([
      'groupStreaks',
      'userDisplayName',
      'groupProfiles'
    ]),
    onTimePayments () {
      return Object.entries(this.groupStreaks.onTimePayments || {})
        .filter(([username, streak]) => streak >= STREAK_ON_TIME_PAYMENTS)
        .sort((a, b) => b[1] - a[1])
        .map(([username, streak]) => L('{user} - {count} month streak', { user: this.userDisplayName(username), count: streak }))
    },
    missedPayments () {
      return Object.entries(this.groupStreaks.missedPayments || {})
        .filter(([username, streak]) => streak >= STREAK_MISSED_PAYMENTS)
        .map(([username, streak]) => {
          const Largs = { user: this.userDisplayName(username), streak }

          return streak >= 2
            ? L('{user} missed {streak} payments', Largs)
            : L('{user} missed {streak} payment', Largs)
        })
    },
    haventLoggedIn () { // group members that haven't logged in for the past 14 days or more
      const now = new Date().toISOString()

      return Object.entries(this.groupProfiles)
        .filter(([username, profile]) => compareISOTimestamps(now, profile.lastLoggedIn) >= STREAK_NOT_LOGGED_IN_DAYS * DAYS_MILLIS)
        .map(([username]) => this.userDisplayName(username))
    },
    noIncomeDetails () { // group members that haven't entered their income details yet
      return Object.entries(this.groupProfiles)
        .filter(([username, profile]) => !profile.incomeDetailsType)
        .map(([username]) => this.userDisplayName(username))
    },
    noVotes () {
      return Object.entries(this.groupStreaks.noVotes || {})
        .filter(([username, streak]) => streak >= STREAK_MISSED_PROPSAL_VOTE)
        .map(([username, streak]) => {
          const Largs = { user: this.userDisplayName(username), streak }

          return streak >= 2
            ? L('{user} missed {streak} votes', Largs)
            : L('{user} missed {streak} vote', Largs)
        })
    },
    groupStreaksSentences () {
      const args = {
        fullMonthlyPledges: { ...LTags('strong'), streak: this.groupStreaks.fullMonthlyPledges || 0 },
        fullMonthlySupport: { ...LTags('strong'), streak: this.groupStreaks.fullMonthlySupport || 0 }
      }

      return {
        'fullMonthlyPledges': this.groupStreaks.fullMonthlyPledges === 1
          ? L('{strong_}100% completed TODO streak of: {streak} month{_strong}', args.fullMonthlyPledges)
          : L('{strong_}100% completed TODO streak of: {streak} months{_strong}', args.fullMonthlyPledges),
        'fullMonthlySupport': this.groupStreaks.fullMonthlySupport === 1
          ? L('{strong_}Mincome goal streak of: {streak} month{_strong}', args.fullMonthlySupport)
          : L('{strong_}Mincome goal streak of: {streak} months{_strong}', args.fullMonthlySupport)
      }
    },
    memberCountSentences () {
      const argsCommon = {
        ...this.LTags('strong'),
        'span_': '<span class="link t-trigger">',
        '_span': '</span>'
      }
      const argsMap = {
        'onTimePayments': { ...argsCommon, membercount: this.onTimePayments.length },
        'haventLoggedIn': { ...argsCommon, days: this.config.notLoggedInDays, membercount: this.haventLoggedIn.length },
        'noIncomeDetails': { ...argsCommon, membercount: this.noIncomeDetails.length },
        'missedPayments': { ...argsCommon, membercount: this.missedPayments.length },
        'noVotes': { ...argsCommon, membercount: this.noVotes.length, proposalcount: this.config.proposalNumber }
      }

      return {
        'onTimePayments': this.onTimePayments.length === 1
          ? L('{span_}1 member{_span} has {strong_} on-time payment streaks{_strong}', argsMap['onTimePayments'])
          : L('{span_}{membercount} members{_span} have {strong_} on-time payment streaks{_strong}', argsMap['onTimePayments']),
        'haventLoggedIn': this.haventLoggedIn.length === 1
          ? L('{span_}1 member{_span} hasn\'t {strong_} logged in past {days} days or more {_strong}', argsMap['haventLoggedIn'])
          : L('{span_}{membercount} members{_span} haven\'t {strong_} logged in past {days} days or more {_strong}', argsMap['haventLoggedIn']),
        'noIncomeDetails': this.noIncomeDetails.length === 1
          ? L('{span_}1 member{_span} hasn\'t {strong_} entered income details{_strong}', argsMap['noIncomeDetails'])
          : L('{span_}{membercount} members{_span} haven\'t {strong_} entered income details{_strong}', argsMap['noIncomeDetails']),
        'missedPayments': this.missedPayments.length === 1
          ? L('{span_}1 member{_span} has {strong_} missed payments {_strong}', argsMap['missedPayments'])
          : L('{span_}{membercount} members{_span} have {strong_} missed payments {_strong}', argsMap['missedPayments']),
        'noVotes': this.noVotes.length === 1
          ? L('{span_}1 member{_span} hasn\'t {strong_} voted in the last {proposalcount} proposals {_strong}', argsMap['noVotes'])
          : L('{span_}{membercount} members{_span} haven\'t {strong_} voted in the last {proposalcount} proposals {_strong}', argsMap['noVotes'])
      }
    }
  }
}: Object)

</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-columns {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;

  @include tablet {
    flex-wrap: nowrap;
  }

  + .c-inactive,
  + .c-columns {
    margin-top: 2rem;
  }
}

.c-column {
  @include tablet {
    width: 50%;
  }
}

.c-member-count {
  display: inline-block;
  margin-right: 0.25rem;
}

.c-para {
  margin: 1rem 1rem 1rem 0;
  display: block;
}

.c-item-wrapper {
  display: flex;
}

.c-item {
  display: flex;
  align-items: center;
  margin: 0.5rem 0;
}

.icon-round {
  width: 2rem;
  height: 2rem;
  margin-right: 1rem;
  flex-shrink: 0;
  border-radius: 50%;
  text-align: center;
  line-height: 2rem;
}

.table {
  margin-top: 1rem;
}
</style>
