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
            .c-item-copy
              i18n(
                :args='{ ...LTags("strong"), timeframe: "2 weeks", pourcent: 100 }'
              ) Group has a streak of {strong_} {pourcent}% Support of {timeframe}{_strong}

        li.c-item-wrapper
          .c-item
            .icon-star.icon-round.has-background-success.has-text-success
            .c-item-copy
              tooltip(direction='bottom-end')
                i18n.link(
                  :args='{  members: 3 }'
                ) {members} members
                template(slot='tooltip')
                  div Rosalía
                  div Ken M
                  div Ines de Castro

              //- Todo: discuss if tooltip better than toggle
              //- i18n.link(
              //-   tag='button'
              //-   :aria-label='L("See members")'
              //-   :args='{  members: 3 }'
              //-   @click='openModal("todoSeeMembers")'
              //- ) {members} members
              i18n(:args='{ ...LTags("strong"), streaks: "4 weeks" }')  have {strong_} streaks of more than {streaks}{_strong}

    .c-column
      i18n.is-title-3(tag='h2') Inactivity
      .has-text-1.c-para Members that haven’t logged in, missed their pledges or haven´t voted last proposals will appear here.

      ul.spacer
        li.c-item-wrapper
          .c-item
            .icon-user.icon-round.has-background-general
            .c-item-copy
              tooltip(direction='bottom-end')
                i18n.link(
                  :args='{  members: 5 }'
                ) {members} members
                template(slot='tooltip')
                  div Rosalía
                  div Ken M
                  div Ines de Castro
                  div Attila the Hun
                  div Istralianda
              i18n(:args='LTags("strong")')  haven´t {strong_} logged in past week {_strong}

        li.c-item-wrapper
          .c-item
            .icon-dollar-sign.icon-round.has-background-general
            .c-item-copy
              tooltip(direction='bottom-end')
                i18n.link(
                  :args='{  members: 3 }'
                ) {members} members
                template(slot='tooltip')
                  div Rosalía
                  div Ken M
                  div Ines de Castro
              i18n(:args='LTags("strong")')  have {strong_} missed payments {_strong}

        li.c-item-wrapper
          .c-item
            .icon-vote-yea.icon-round.has-background-general
            .c-item-copy
              tooltip(direction='bottom-end')
                i18n.link(
                  :args='{  members: 3 }'
                ) {members} members
                template(slot='tooltip')
                  div Rosalía
                  div Ken M
                  div Ines de Castro
              i18n(:args='{ ...LTags("strong"), proposalNumber: 2 }')  haven´t {strong_} voted in the last {proposalNumber} proposals {_strong}

</template>

<script>
import Tooltip from '@components/Tooltip.vue'

export default ({
  name: 'GroupMembersActivity',
  data () {
    return {
      isReady: false,
      history: []
    }
  },
  components: {
    Tooltip
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
