<template lang='pug'>
.c-poll-voted
  i18n.c-poll-label(tag='label') poll
  h3.is-title-4.c-poll-title {{ pollData.question }}

  .c-options-and-voters
    ul.c-options-list
      li.c-option(
        v-for='option in list.percents'
        :key='option.id'
      )
        .c-option-name-and-percent
          .c-name {{ option.name }}
          .c-percent {{ option.percent }}

        .c-option-bar
          .c-option-bar-measure(:style='{ width: option.percent }')

    .c-voters
      .c-voter-avatars-item(v-for='entry in list.voters' :key='entry.id')
        voter-avatars(:voters='entry.users')
</template>

<script>
import { uniq } from '@model/contracts/shared/giLodash.js'
import VoterAvatars from './VoterAvatars.vue'

export default ({
  name: 'PollVoted',
  inject: ['pollUtils'],
  props: {
    pollData: Object
  },
  components: {
    VoterAvatars
  },
  computed: {
    list () {
      const percents = []
      const voters = []

      this.pollData.options.forEach(opt => {
        percents.push({
          id: opt.id,
          percent: this.getPercent(opt.voted),
          name: opt.value
        })

        voters.push({
          id: opt.id,
          users: uniq(opt.voted)
        })
      })

      return {
        percents, voters
      }
    }
  },
  methods: {
    getPercent (votes) {
      return `${Math.round(votes.length / this.pollUtils.totalVoteCount() * 100)}%`
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-poll-voted {
  position: relative;
}

.c-poll-label {
  display: block;
  text-transform: uppercase;
  color: $text_1;
  font-size: $size_5;
}

.c-poll-title {
  margin-bottom: 1.375rem;
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
  display: block;

  &:not(:last-child) {
    margin-bottom: 1rem;
  }

  &-name-and-percent {
    display: flex;
    justify-content: space-between;
    font-size: $size_4;
    margin-bottom: 0.5rem;
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
    background-color: $primary_0;
    height: 10px;
  }
}

.c-voters {
  position: relative;
  margin-left: 0.75rem;
}

.c-voter-avatars-item {
  display: flex;
  align-items: flex-end;
  width: max-content;
  height: 2.5rem;

  &:not(:last-of-type) {
    margin-bottom: 1rem;
  }
}
</style>
