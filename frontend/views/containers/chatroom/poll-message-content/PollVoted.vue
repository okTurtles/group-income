<template lang='pug'>
.c-poll-voted
  i18n.c-poll-label(tag='label') poll
  h3.is-title-4.c-poll-title {{ pollData.question }}

  .c-options-and-voters
    ul.c-options-list
      li.c-option(
        v-for='option in pollData.options'
        :key='option.id'
      )
        .c-option-name-and-percent
          .c-name {{ option.value }}
          .c-percent {{ getPercent(option.voted) }}

        .c-option-bar
          .c-option-bar-measure(:style='{ width: getPercent(option.voted) }')
</template>

<script>
export default ({
  name: 'PollVoted',
  inject: ['pollUtils'],
  props: {
    pollData: Object
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

.c-poll-label {
  display: block;
  text-transform: uppercase;
  color: $text_1;
  font-size: $size_5;
}

.c-poll-title {
  margin-bottom: 1.375rem;
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
</style>
