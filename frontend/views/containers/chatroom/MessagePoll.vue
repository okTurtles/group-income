<template lang='pug'>
message-base(
  v-bind='$props'
  @delete-message='deleteMessage'
  @add-emoticon='addEmoticon($event)'
)
  template(#body='')
    i18n.c-poll-created-sentence(tag='p') Created a new poll:

  template(#full-width-body='')
    .c-poll-container
      component.c-poll-inner(
        :is='messageContentComponent'
        :isPollEditable='isPollEditable'
        :messageId='messageId'
        :messageHash='messageHash'
        :pollData='pollData'
      )
</template>

<script>
import { mapGetters } from 'vuex'
import MessageBase from './MessageBase.vue'
import { MESSAGE_VARIANTS } from '@model/contracts/shared/constants.js'
import PollToVote from './poll-message-content/PollToVote.vue'
import PollVoted from './poll-message-content/PollVoted.vue'

export default ({
  name: 'MessagePoll',
  components: {
    MessageBase,
    PollToVote,
    PollVoted
  },
  props: {
    pollData: Object, // { creator, status, question, options ... }
    messageId: String,
    messageHash: String,
    who: String,
    type: String,
    avatar: String,
    emoticonsList: {
      type: Object,
      default: null
    },
    datetime: {
      type: Date,
      required: true
    },
    variant: {
      type: String,
      validator (value) {
        return Object.values(MESSAGE_VARIANTS).indexOf(value) !== -1
      }
    },
    isCurrentUser: Boolean // says if the current user is the creator of the message
  },
  computed: {
    ...mapGetters([
      'ourUsername'
    ]),
    votesFlattened () {
      return this.pollData.options.reduce((accu, opt) => [...accu, ...opt.voted], [])
    },
    hasVoted () { // checks if the current user has voted on this poll or not
      return this.votesFlattened.includes(this.ourUsername)
    },
    isPollEditable () { // If the current user is the creator of the poll and no one has voted yet, poll can be editted.
      return this.isCurrentUser && this.votesFlattened.length === 0
    },
    messageContentComponent () {
      return this.hasVoted ? 'poll-voted' : 'poll-to-vote'
    }
  },
  methods: {
    submitSelections () {
      alert('TODO: implement poll selection.')
    },
    deleteMessage () {
      this.$emit('delete-message')
    },
    addEmoticon (emoticon) {
      this.$emit('add-emoticon', emoticon)
    }
  },
  provide () {
    return {
      pollUtils: {
        hasVoted: this.hasVoted,
        totalVoteCount: this.votesFlattened.length
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-poll-created-sentence {
  color: $text_1;
  font-style: italic;
  margin-bottom: 0.75rem;
}

.c-poll-container {
  margin-bottom: 0.25rem;

  @include tablet {
    padding-left: 2.5rem;
  }
}

.c-poll-inner {
  width: 100%;
  border-radius: 10px;
  border: 1px solid $general_0;
  padding: 1rem;
}
</style>
