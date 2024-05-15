<template lang='pug'>
message-base.c-message-poll(
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
        :isChangeMode='ephemeral.isChangeMode'
        :messageId='messageId'
        :messageHash='messageHash'
        :pollData='pollData'
      )

      banner-scoped(ref='errBanner')
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import MessageBase from './MessageBase.vue'
import { MESSAGE_VARIANTS, POLL_STATUS } from '@model/contracts/shared/constants.js'
import { DAYS_MILLIS, MINS_MILLIS } from '@model/contracts/shared/time.js'
import PollToVote from './poll-message-content/PollToVote.vue'
import PollVoteResult from './poll-message-content/PollVoteResult.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'

export default ({
  name: 'MessagePoll',
  components: {
    MessageBase,
    PollToVote,
    PollVoteResult,
    BannerScoped
  },
  props: {
    pollData: Object, // { creator, status, question, options ... }
    messageId: String,
    messageHash: String,
    currentUserID: String,
    who: String,
    type: String,
    from: String,
    avatar: [Object, String],
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
    isMsgSender: Boolean // says if the current user is the creator of the message
  },
  data () {
    return {
      ephemeral: {
        isChangeMode: false
      }
    }
  },
  computed: {
    ...mapGetters([
      'ourIdentityContractId',
      'currentChatRoomId'
    ]),
    votesFlattened () {
      return this.pollData.options.reduce((accu, opt) => [...accu, ...opt.voted], [])
    },
    hasVoted () { // checks if the current user has voted on this poll or not
      return this.votesFlattened.includes(this.ourIdentityContractId)
    },
    isPollEditable () { // If the current user is the creator of the poll and no one has voted yet, poll can be editted.
      return this.isMsgSender && this.votesFlattened.length === 0
    },
    isPollExpired () {
      return this.pollData.status === POLL_STATUS.CLOSED
    },
    messageContentComponent () {
      if (this.hasVoted) {
        return this.ephemeral.isChangeMode ? 'poll-to-vote' : 'poll-vote-result'
      } else {
        return this.isPollExpired ? 'poll-vote-result' : 'poll-to-vote'
      }
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
    },
    switchOnChangeMode () {
      this.ephemeral.isChangeMode = true
    },
    switchOffChangeMode () {
      this.ephemeral.isChangeMode = false
    },
    checkAndSetupPollExpirationTimer () {
      const markPollClosed = async () => {
        try {
          await sbp('gi.actions/chatroom/closePoll', {
            contractID: this.currentChatRoomId,
            data: { hash: this.messageHash }
          })
        } catch (e) {
          console.error('"closePoll" action failed: ', e)
          this.$refs.errBanner.danger(e.message)
        }
      }

      const checkAndSetTimer = () => {
        if (Date.now() - this.pollData.expires_date_ms) {
          markPollClosed()
        } else {
          this.expirationTimeoutId = setTimeout(checkAndSetTimer, MINS_MILLIS)
        }
      }
      const timeDiff = Date.now() - this.pollData.expires_date_ms

      if (timeDiff >= 0) {
        // if the poll has been expired, mark it 'closed' immediately.
        markPollClosed()
      } else if (Math.abs(timeDiff) < DAYS_MILLIS) {
        // if the poll is expiring soon(at least within 24 hrs), periodically check & mark it 'closed'.
        // NOTE: this logic is actually a good candidate for a periodic-notification entry in mainNotificationsMixin.js,
        //       but there is a challenge in accessing a particular chat-message data in there.
        //       (couldn't find a way to access a chat-message item via vuex state/getters)
        //       So implemented this logic here.
        this.expirationTimeoutId = setTimeout(checkAndSetTimer, MINS_MILLIS)
      }
    }
  },
  provide () {
    return {
      pollUtils: {
        hasVoted: () => this.hasVoted,
        totalVoteCount: () => this.votesFlattened.length,
        switchOnChangeMode: this.switchOnChangeMode,
        switchOffChangeMode: this.switchOffChangeMode
      }
    }
  },
  created () {
    this.checkAndSetupPollExpirationTimer()
  },
  beforeDestroy () {
    if (this.expirationTimeoutId) {
      clearTimeout(this.expirationTimeoutId)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-message-poll {
  max-height: unset;
  height: max-content;

  &:hover {
    ::v-deep .c-option-bar {
      background-color: $general_1;
    }
  }
}

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
  position: relative;
  width: 100%;
  border-radius: 10px;
  border: 1px solid $general_0;
  padding: 1rem;
}
</style>
