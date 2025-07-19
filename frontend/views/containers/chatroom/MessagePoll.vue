<template lang='pug'>
message-base.c-message-poll(
  v-bind='$props'
  @delete-message='deleteMessage'
  @add-emoticon='addEmoticon($event)'
  @pin-to-channel='$emit("pin-to-channel")'
  @unpin-from-channel='$emit("unpin-from-channel")'
)
  template(#body='')
    i18n.c-poll-created-sentence(tag='p') Created a new poll:

  template(#full-width-body='')
    .c-poll-container
      component.c-poll-inner(
        :is='messageContentComponent'
        :isPollEditable='isPollEditable'
        :isChangeMode='isEditing'
        :messageId='messageId'
        :messageHash='messageHash'
        :pollData='pollData'
        @request-vote-change='switchOnChangeMode'
        @cancel-vote-change='switchOffChangeMode'
      )

      banner-scoped(ref='errBanner')
</template>

<script>
import sbp from '@sbp/sbp'
import MessageBase from './MessageBase.vue'
import { MESSAGE_VARIANTS } from '@model/contracts/shared/constants.js'
import { DAYS_MILLIS, MINS_MILLIS } from '@model/contracts/shared/time.js'
import PollToVote from './poll-message-content/PollToVote.vue'
import PollVoteResult from './poll-message-content/PollVoteResult.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import PollMixin from '@containers/chatroom/PollMixin.js'

export default ({
  name: 'MessagePoll',
  mixins: [PollMixin],
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
    updatedDate: {
      type: String,
      required: false
    },
    variant: {
      type: String,
      validator (value) {
        return Object.values(MESSAGE_VARIANTS).indexOf(value) !== -1
      }
    },
    pinnedBy: String,
    isMsgSender: Boolean, // says if the current user is the creator of the message
    isFocused: Boolean,
    isEditing: Boolean
  },
  computed: {
    messageContentComponent () {
      if (this.hasVoted) {
        return this.isEditing ? 'poll-to-vote' : 'poll-vote-result'
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
      this.$emit('message-is-editing', true)
    },
    switchOffChangeMode () {
      this.$emit('message-is-editing', false)
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
        if (Date.now() - this.pollData.expires_date_ms >= 0) {
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
        // if the poll is expiring soon(at least within 24 hours), periodically check & mark it 'closed'.
        // NOTE: this logic is actually a good candidate for a periodic-notification entry in mainNotificationsMixin.js,
        //       but there is a challenge in accessing a particular chat-message data in there.
        //       (couldn't find a way to access a chat-message item via vuex state/getters)
        //       So implemented this logic here.
        this.expirationTimeoutId = setTimeout(checkAndSetTimer, MINS_MILLIS)
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
