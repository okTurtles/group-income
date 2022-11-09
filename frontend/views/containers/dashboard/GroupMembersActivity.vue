<template lang='pug'>
.c-wrapper
  .c-columns
    .c-column
      i18n.is-title-3(tag='h2') Streaks
      i18n.has-text-1.c-para Information about your pledges streaks and other streak members appears here.

      ul.spacer
        li.c-item-wrapper(v-if='groupStreaks.fullMonthlyPledges > 1')
          .c-item
            .icon-star.icon-round.has-background-success.has-text-success
            .c-item-copy
              i18n(
                :args='{ ...LTags("strong"), streak: groupStreaks.fullMonthlyPledges }'
              ) Group has a streak of {strong_} 100% Support of {streak} months{_strong}

        li.c-item-wrapper(v-if='onTimeStreakMembers.length > 0')
          .c-item
            .icon-star.icon-round.has-background-success.has-text-success
            .c-item-copy
              member-count-tooltip.c-on-time-streak-count(:members='onTimeStreakMembers')

              //- Todo: discuss if tooltip better than toggle
              //- i18n.link(
              //-   tag='button'
              //-   :aria-label='L("See members")'
              //-   :args='{  members: 3 }'
              //-   @click='openModal("todoSeeMembers")'
              //- ) {members} members
              i18n(:args='{ ...LTags("strong") }') have {strong_} on-time payment streaks{_strong}

    .c-column
      i18n.is-title-3(tag='h2') Inactivity
      .has-text-1.c-para Members that haven’t logged in, missed their pledges or haven´t voted last proposals will appear here.

      ul.spacer
        li.c-item-wrapper
          .c-item
            .icon-user.icon-round.has-background-general
            .c-item-copy
              member-count-tooltip(
                :members='["Rosalia", "Ken M", "Ines de Castro", "Attila the Hun", "Istralianda"]'
              )
              i18n(:args='LTags("strong")')  haven´t {strong_} logged in past week {_strong}

        li.c-item-wrapper
          .c-item
            .icon-dollar-sign.icon-round.has-background-general
            .c-item-copy
              member-count-tooltip(
                :members='["Rosalia", "Ken M", "Ines de Castro"]'
              )
              i18n(:args='LTags("strong")')  have {strong_} missed payments {_strong}

        li.c-item-wrapper
          .c-item
            .icon-vote-yea.icon-round.has-background-general
            .c-item-copy
              member-count-tooltip(
                :members='["Rosalia", "Ken M", "Ines de Castro"]'
              )
              i18n(:args='{ ...LTags("strong"), proposalNumber: 2 }')  haven´t {strong_} voted in the last {proposalNumber} proposals {_strong}

</template>

<script>
import { mapGetters } from 'vuex'
import MemberCountTooltip from './MemberCountTooltip.vue'

export default ({
  name: 'GroupMembersActivity',
  components: {
    MemberCountTooltip
  },
  data () {
    return {
      isReady: false,
      history: []
    }
  },
  computed: {
    ...mapGetters([
      'groupStreaks',
      'globalProfile'
    ]),
    onTimeStreakMembers () {
      const membersOnStreak = []
      const getDisplayName = name => this.globalProfile(name).displayName || name

      for (const username in this.groupStreaks.onTimePayments) {
        if (this.groupStreaks.onTimePayments[username] >= 2) {
          membersOnStreak.push(getDisplayName(username))
        }
      }

      return Object.entries(this.groupStreaks.onTimePayments)
        .filter(([username, streak]) => streak >= 2)
        .map(([username]) => getDisplayName(username))
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

.c-on-time-streak-count {
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
