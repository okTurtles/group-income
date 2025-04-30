<template lang='pug'>
.c-poll-voted
  .c-content-header
    .c-label-container
      label.c-poll-label
        i18n poll
        i18n.c-anonymous-postfix(v-if='isAnonymousPoll') (Votes Hidden)
      i18n.pill.is-primary.c-expiry-badge(v-if='!isPollExpired' :args='{ expiry: pollExpiryDate }') Expires on: {expiry}
    h3.is-title-4 {{ pollData.question }}

    i18n.pill.is-neutral.c-poll-closed-badge(v-if='isPollExpired') Poll closed
    menu-parent.c-poll-menu(v-else-if='!readOnly')
      menu-trigger.is-icon.c-poll-menu-trigger
        i.icon-ellipsis-v
      menu-content.c-poll-menu-content
        ul
          menu-item(tag='button' data-test='changeVote' icon='edit' @click='$emit("request-vote-change")')
            i18n Change vote

  .c-options-and-voters
    ul.c-options-list
      li.c-option(
        v-for='option in optionsList'
        :key='option.id'
      )
        .c-option-left-section
          .c-option-name-and-percent
            .c-name {{ option.name }}
            .c-percent {{ option.percent }}

          .c-option-bar
            .c-option-bar-measure(
              :class='{ "has-my-vote": option.hasMyVote }'
              :style='{ width: option.percent }'
            )

        .c-option-right-section(
          v-if='!isAnonymousPoll'
          :style='rightSectionStyle'
        )
          voter-avatars(:voters='option.users' :optionName='option.name')
</template>

<script>
import { uniq } from 'turtledash'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'
import VoterAvatars from './VoterAvatars.vue'
import PollMixin from '@containers/chatroom/PollMixin.js'

export default ({
  name: 'PollVoteResult',
  props: {
    pollData: Object,
    readOnly: Boolean
  },
  mixins: [PollMixin],
  components: {
    VoterAvatars,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem
  },
  computed: {
    optionsList () {
      return this.pollData.options.map(opt => {
        return {
          id: opt.id,
          percent: this.getPercent(opt.voted),
          name: opt.value,
          hasMyVote: opt.voted.includes(this.ourIdentityContractId),
          users: uniq(opt.voted)
        }
      })
    },
    rightSectionStyle () {
      const maxInList = this.optionsList.reduce((currMax, opt) => Math.max(currMax, opt.users.length), 0)
      const maxAvatarCount = Math.min(maxInList, 3)

      return {
        width: `${(maxAvatarCount * 1.5) - (maxAvatarCount - 1) * 0.375}rem`
      }
    }
  },
  methods: {
    getPercent (votes) {
      const total = this.totalVoteCount
      return total === 0
        ? '0%'
        : `${Math.round(votes.length / this.totalVoteCount * 100)}%`
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-poll-voted {
  position: relative;
}

.c-content-header {
  margin-bottom: 1.375rem;
  padding-right: 3.25rem;
}

.c-expiry-badge {
  margin-bottom: 1rem;
}

.c-poll-label {
  display: block;
  text-transform: uppercase;
  color: $text_1;
  font-size: $size_5;
  margin-right: 0.25rem;
}

.c-anonymous-postfix {
  display: inline-block;
  margin-left: 0.25rem;
  font-weight: bold;
}

.c-poll-closed-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  text-transform: uppercase;
}

.c-poll-menu {
  position: absolute;
  width: max-content;
  top: 1rem;
  right: 1rem;
  z-index: 10;

  &-content {
    top: 3.25rem;
    left: unset;
    right: 0;
    width: max-content;
  }
}

.c-options-and-voters {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto;
  grid-template-areas: "o-percent o-voters";
}

.c-options-list {
  grid-area: o-percent;
}

.c-option {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  column-gap: 0.75rem;

  &:not(:last-child) {
    margin-bottom: 1rem;
  }

  &-left-section,
  &-right-section {
    position: relative;
    display: block;
  }

  &-left-section {
    flex-grow: 1;
  }

  &-right-section {
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  &-name-and-percent {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    font-size: $size_4;
    margin-bottom: 0.5rem;

    > .c-name {
      display: inline-block;
      margin-right: 0.5rem;
      word-break: break-word;
    }
  }

  &-bar {
    position: relative;
    width: 100%;
    height: 10px;
    border-radius: 10px;
    background-color: $general_2;
    overflow: hidden;
  }

  &-bar-measure {
    position: absolute;
    top: 0;
    left: 0;
    border-radius: 10px;
    background-color: $primary_1;
    height: 10px;

    &.has-my-vote {
      background-color: $primary_0;
    }
  }
}
</style>
