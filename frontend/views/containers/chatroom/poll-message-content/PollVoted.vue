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
</template>

<script>
export default ({
  name: 'PollVoted',
  inject: ['pollUtils'],
  props: {
    pollData: Object
  },
  methods: {
    getPercent(votes) {
      return `${Math.round(votes.length /this.pollUtils.totalVoteCount)}%`
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
</style>
