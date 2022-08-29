<template lang='pug'>
.c-chat-main(v-if='summary.title')
  emoticons
  .c-body
    .c-body-loading(v-if='details.isLoading')
      loading
        //
          TODO later - Design a cool skeleton loading
          - this should be done only after knowing exactly how server gets each conversation data

    .c-body-conversation(
      v-else
      ref='conversation'
      data-test='conversationWapper'
      @scroll='onChatScroll'
    )

      infinite-loading(
        direction='top'
        slot='append'
        @infinite='infiniteHandler'
        force-use-infinite-wrapper='.c-body-conversation'
      )
        div(slot='no-more')
          conversation-greetings(
            :members='details.numberOfParticipants'
            :creator='summary.creator'
            :type='type'
            :joined='summary.joined'
            :name='summary.title'
            :description='summary.description'
          )
        div(slot='no-results')
          conversation-greetings(
            :members='details.numberOfParticipants'
            :creator='summary.creator'
            :type='type'
            :joined='summary.joined'
            :name='summary.title'
            :description='summary.description'
          )

      template(v-for='(message, index) in messages')
        .c-divider(
          v-if='changeDay(index) || isNew(message.id)'
          :class='{"is-new": isNew(message.id)}'
          :key='`date-${index}`'
        )
          i18n.c-new(v-if='isNew(message.id)' :class='{"is-new-date": changeDay(index)}') New
          span(v-else-if='changeDay(index)') {{proximityDate(message.datetime)}}

        component(
          :is='messageType(message)'
          :ref='message.id'
          :key='message.id'
          :text='message.text'
          :type='message.type'
          :notification='message.notification'
          :replyingMessage='replyingMessage(message)'
          :from='message.from'
          :datetime='time(message.datetime)'
          :edited='!!message.updatedDate'
          :emoticonsList='message.emoticons'
          :who='who(message)'
          :currentUsername='currentUserAttr.username'
          :avatar='avatar(message.from)'
          :variant='variant(message)'
          :isSameSender='isSameSender(index)'
          :isCurrentUser='isCurrentUser(message.from)'
          :class='{removed: message.delete}'
          @retry='retryMessage(index)'
          @reply='replyMessage(message)'
          @scroll-to-replying-message='scrollToMessage(message.replyingMessage.id)'
          @edit-message='(newMessage) => editMessage(message, newMessage)'
          @delete-message='deleteMessage(message)'
          @add-emoticon='addEmoticon(message, $event)'
        )

  .c-footer
    send-area(
      v-if='summary.joined'
      :loading='details.isLoading'
      :replying-message='ephemeral.replyingMessage'
      :replying-message-id='ephemeral.replyingMessageId'
      :replying-to='ephemeral.replyingTo'
      :title='summary.title'
      :scrolledUp='isScrolledUp'
      @send='handleSendMessage'
      @jump-to-latest='updateScroll'
      @stop-replying='stopReplying'
    )
    view-area(
      v-else
      :joined='summary.joined'
      :title='summary.title'
    )
</template>

<script>
import sbp from '@sbp/sbp'
import { GIMessage } from '~/shared/domains/chelonia/chelonia.js'
import { mapGetters } from 'vuex'
import Avatar from '@components/Avatar.vue'
import InfiniteLoading from 'vue-infinite-loading'
import Loading from '@components/Loading.vue'
import Message from './Message.vue'
import MessageInteractive from './MessageInteractive.vue'
import MessageNotification from './MessageNotification.vue'
import ConversationGreetings from '@containers/chatroom/ConversationGreetings.vue'
import SendArea from './SendArea.vue'
import ViewArea from './ViewArea.vue'
import Emoticons from './Emoticons.vue'
import { MESSAGE_TYPES, MESSAGE_VARIANTS, CHATROOM_ACTIONS_PER_PAGE, CHATROOM_MESSAGE_ACTION } from '@model/contracts/shared/constants.js'
import { createMessage, findMessageIdx } from '@model/contracts/shared/functions.js'
import { proximityDate, MINS_MILLIS } from '@model/contracts/shared/time.js'
import { cloneDeep, debounce } from '@model/contracts/shared/giLodash.js'
import { CONTRACT_IS_SYNCING } from '~/shared/domains/chelonia/events.js'

export default ({
  name: 'ChatMain',
  components: {
    Avatar,
    ConversationGreetings,
    Emoticons,
    InfiniteLoading,
    Loading,
    Message,
    MessageInteractive,
    MessageNotification,
    SendArea,
    ViewArea
  },
  props: {
    summary: {
      type: Object, // { type: String, title: String, description: String, routerBack: String }
      default () { return {} }
    },
    details: {
      type: Object, // { isLoading: Bool, participants: Object }
      default () { return {} }
    },
    type: {
      type: String
    }
  },
  data () {
    return {
      config: {
        isPhone: null
      },
      latestEvents: [],
      messages: [],
      ephemeral: {
        startedUnreadMessageId: null,
        scrolledDistance: 0,
        infiniteLoading: null,
        shouldRefreshMessages: true,
        replyingMessage: null,
        replyingMessageId: null,
        replyingTo: null
      }
    }
  },
  created () {
    // TODO #492 create a global Vue Responsive just for media queries.
    const mediaIsPhone = window.matchMedia('screen and (max-width: 639px)')
    this.config.isPhone = mediaIsPhone.matches
    mediaIsPhone.onchange = (e) => { this.config.isPhone = e.matches }
  },
  mounted () {
    this.setMessageEventListener({ force: true })
    this.setInitMessages()
    window.addEventListener('resize', this.resizeEventHandler)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', `${CHATROOM_MESSAGE_ACTION}-${this.currentChatRoomId}`, this.listenChatRoomActions)
    window.removeEventListener('resize', this.resizeEventHandler)
  },
  computed: {
    ...mapGetters([
      'currentChatRoomId',
      'chatRoomSettings',
      'chatRoomAttributes',
      'chatRoomUsers',
      'ourIdentityContractId',
      'currentIdentityState',
      'isJoinedChatRoom',
      'setChatRoomScrollPosition',
      'currentChatRoomScrollPosition',
      'currentChatRoomUnreadSince',
      'currentGroupNotifications',
      'currentChatRoomUnreadMentions'
    ]),
    currentUserAttr () {
      return {
        ...this.currentIdentityState.attributes,
        id: this.ourIdentityContractId
      }
    },
    isScrolledUp () {
      if (!this.ephemeral.scrolledDistance) {
        return false
      }
      return this.ephemeral.scrolledDistance > 500
    }
  },
  methods: {
    proximityDate,
    messageType (message) {
      return {
        [MESSAGE_TYPES.NOTIFICATION]: 'message-notification',
        [MESSAGE_TYPES.INTERACTIVE]: 'message-interactive',
        [MESSAGE_TYPES.TEXT]: 'message',
        [MESSAGE_TYPES.POLL]: 'message-poll'
      }[message.type]
    },
    isCurrentUser (from) {
      return this.currentUserAttr.username === from
    },
    who (message) {
      const user = this.isCurrentUser(message.from) ? this.currentUserAttr : this.details.participants[message.from]
      return user?.displayName || user?.username || message.from
    },
    variant (message) {
      if (message.pending) {
        return MESSAGE_VARIANTS.PENDING
      } else if (message.hasFailed) {
        return MESSAGE_VARIANTS.FAILED
      } else {
        return this.isCurrentUser(message.from) ? MESSAGE_VARIANTS.SENT : MESSAGE_VARIANTS.RECEIVED
      }
    },
    replyingMessage (message) {
      return message.replyingMessage ? message.replyingMessage.text : ''
    },
    time (strTime) {
      return new Date(strTime)
    },
    avatar (from) {
      if (from === MESSAGE_TYPES.NOTIFICATION || from === MESSAGE_TYPES.INTERACTIVE) {
        return this.currentUserAttr.picture
      }
      return this.details.participants[from]?.picture
    },
    isSameSender (index) {
      if (!this.messages[index - 1]) { return false }
      if (this.messages[index].type !== MESSAGE_TYPES.TEXT) { return false }
      if (this.messages[index].type !== this.messages[index - 1].type) { return false }
      const timeBetween = new Date(this.messages[index].datetime).getTime() -
        new Date(this.messages[index - 1].datetime).getTime()
      if (timeBetween > MINS_MILLIS * 10) { return false }
      return this.messages[index].from === this.messages[index - 1].from
    },
    stopReplying () {
      this.ephemeral.replyingMessage = null
      this.ephemeral.replyingMessageId = null
      this.ephemeral.replyingTo = null
    },
    handleSendMessage (message) {
      const replyingMessage = this.ephemeral.replyingMessageId
        ? { id: this.ephemeral.replyingMessageId, text: this.ephemeral.replyingMessage }
        : null
      // Consider only simple TEXT now
      // TODO: implement other types of messages later
      const data = { type: MESSAGE_TYPES.TEXT, text: message }

      sbp('gi.actions/chatroom/addMessage', {
        contractID: this.currentChatRoomId,
        data: !replyingMessage ? data : { ...data, replyingMessage },
        hooks: {
          prepublish: (message) => {
            const msgValue = JSON.parse(message.opValue())
            const { meta, data } = msgValue
            this.messages.push({
              ...createMessage({ meta, data, hash: message.hash() }),
              // TODO: pending is useful to turn the message gray meaning failed (just like Slack)
              // when we don't get event after a certain period
              pending: true
            })
            this.stopReplying()
            this.updateScroll()
          }
        }
      })
    },
    async scrollToMessage (messageId, effect = true) {
      if (!messageId || !this.messages.length) {
        return
      }

      const scrollAndHighlight = (index) => {
        const eleMessage = document.querySelectorAll('.c-body-conversation > .c-message')[index]
        const eleTarget = document.querySelectorAll('.c-body-conversation > .c-message')[Math.max(0, index - 1)]

        if (!eleTarget) { return }

        if (effect) {
          eleTarget.scrollIntoView({ behavior: 'smooth' })
          eleMessage.classList.add('c-focused')
          setTimeout(() => {
            eleMessage.classList.remove('c-focused')
          }, 1500)
        } else {
          eleTarget.scrollIntoView()
        }
      }

      const msgIndex = findMessageIdx(messageId, this.messages)
      if (msgIndex >= 0) {
        scrollAndHighlight(msgIndex)
      } else {
        const limit = this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE
        const events = await sbp('chelonia/out/eventsBetween', messageId, this.messages[0].id, limit / 2)
        if (events && events.length) {
          await this.rerenderEvents(events, false)

          const msgIndex = findMessageIdx(messageId, this.messages)
          if (msgIndex >= 0) {
            scrollAndHighlight(msgIndex)
          } else {
            // this is when the target message is deleted after reply message
            // should let user know the target message is deleted
            console.debug('Message is removed')
          }
        }
      }
    },
    updateScroll (scrollTargetMessage = null) {
      if (this.summary.title) {
        // force conversation viewport to be at the bottom (most recent messages)
        setTimeout(() => {
          if (scrollTargetMessage) {
            this.scrollToMessage(scrollTargetMessage, false)
          } else if (this.$refs.conversation) {
            this.$refs.conversation.scroll({
              left: 0,
              top: this.$refs.conversation.scrollHeight,
              behavior: 'smooth'
            })
          }
        }, 100)
      }
    },
    retryMessage (index) {
      // this.$set(this.ephemeral.pendingMessages[index], 'hasFailed', false)
      console.log('TODO $store - retry sending a message')
    },
    replyMessage (message) {
      this.ephemeral.replyingMessage = message.text
      this.ephemeral.replyingMessageId = message.id
      this.ephemeral.replyingTo = this.who(message)
    },
    editMessage (message, newMessage) {
      sbp('gi.actions/chatroom/editMessage', {
        contractID: this.currentChatRoomId,
        data: {
          id: message.id,
          createdDate: message.datetime,
          text: newMessage
        },
        hooks: {
          prepublish: (msg) => {
            message.text = newMessage
            message.pending = true
          }
        }
      })
    },
    deleteMessage (message) {
      sbp('gi.actions/chatroom/deleteMessage', {
        contractID: this.currentChatRoomId,
        data: { id: message.id },
        hooks: {
          prepublish: (msg) => {
            // need to do something
          }
        }
      })
    },
    changeDay (index) {
      const conv = this.messages
      if (index > 0 && index <= conv.length) {
        const prev = new Date(conv[index - 1].datetime)
        const current = new Date(conv[index].datetime)
        return prev.getDay() !== current.getDay()
      } else return false
    },
    isNew (msgId) {
      return this.ephemeral.startedUnreadMessageId === msgId
    },
    addEmoticon (message, emoticon) {
      sbp('gi.actions/chatroom/makeEmotion', {
        contractID: this.currentChatRoomId,
        data: { id: message.id, emoticon },
        hooks: {
          prepublish: (msg) => {
            // need to do something
          }
        }
      })
    },
    getSimulatedState (initialize = true) {
      return {
        settings: cloneDeep(this.chatRoomSettings),
        attributes: cloneDeep(this.chatRoomAttributes),
        users: cloneDeep(this.chatRoomUsers),
        messages: initialize ? [] : this.messages,
        saveMessage: true
      }
    },
    async renderMoreMessages (refresh = false) {
      const limit = this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE
      /***
       * if the removed message was the starting position of unread messages
       * we can load message of that hash(messageId) but not scroll
       * because it doesn't exist in this.messages
       * So in this case, we will load messages until the first unread mention
       * and scroll to that message
       */
      const curChatRoomId = this.currentChatRoomId
      let unreadPosition = null
      if (this.currentChatRoomUnreadSince) {
        if (!this.currentChatRoomUnreadSince.deletedDate) {
          unreadPosition = this.currentChatRoomUnreadSince.messageId
        } else if (this.currentChatRoomUnreadMentions.length) {
          unreadPosition = this.currentChatRoomUnreadMentions[0].messageId
        }
      }
      const messageIdToScroll = this.currentChatRoomScrollPosition || unreadPosition
      const latestHash = await sbp('chelonia/out/latestHash', this.currentChatRoomId)
      const before = refresh || !this.latestEvents.length
        ? latestHash
        : GIMessage.deserialize(this.latestEvents[0]).hash()
      let events = null
      if (refresh && messageIdToScroll) {
        events = await sbp('chelonia/out/eventsBetween', messageIdToScroll, latestHash, limit / 2)
      } else {
        events = await sbp('chelonia/out/eventsBefore', before, limit)
      }
      if (curChatRoomId !== this.currentChatRoomId) {
        // this.currentChatRoomId is a vuex getter and it could be changed
        // while we get events from backend. This happens when users switch chatrooms very quickly
        // In this case, we should avoid the previous events and only necessary to render the last events
        return
      }
      await this.rerenderEvents(events, refresh)

      if (refresh) {
        this.setStartNewMessageIndex()
        const scrollTargetMessage = refresh && messageIdToScroll
          ? messageIdToScroll
          : null
        this.updateScroll(scrollTargetMessage)
        return false
      }

      return events.length < limit
    },
    async rerenderEvents (events, refresh) {
      if (refresh) {
        this.latestEvents = events
      } else {
        events.pop() // remove duplication
        this.latestEvents.unshift(...events)
      }

      const state = this.getSimulatedState(true)
      for (const event of this.latestEvents) {
        await sbp('chelonia/private/in/processMessage', GIMessage.deserialize(event), state)
      }
      this.messages = state.messages
      this.$forceUpdate()
    },
    setInitMessages () {
      this.shouldRefreshMessages = true
      this.messages = []
      if (this.ephemeral.infiniteLoading) {
        this.ephemeral.infiniteLoading.reset()
      }
    },
    setStartNewMessageIndex () {
      this.ephemeral.startedUnreadMessageId = null
      if (this.currentChatRoomUnreadSince) {
        const startUnreadMessage = this.messages
          .find(msg => new Date(msg.datetime).getTime() > new Date(this.currentChatRoomUnreadSince.createdDate).getTime())
        if (startUnreadMessage) {
          this.ephemeral.startedUnreadMessageId = startUnreadMessage.id
        }
      }
    },
    setMessageEventListener ({ force = false, from, to }) {
      if (from) {
        sbp('okTurtles.events/off', `${CHATROOM_MESSAGE_ACTION}-${from}`, this.listenChatRoomActions)
      }
      if (force) {
        sbp('okTurtles.events/on', `${CHATROOM_MESSAGE_ACTION}-${to || this.currentChatRoomId}`, this.listenChatRoomActions)
      } else if (this.isJoinedChatRoom(to)) {
        sbp('okTurtles.events/on', `${CHATROOM_MESSAGE_ACTION}-${to}`, this.listenChatRoomActions)
      }
    },
    updateUnreadMessageId ({ messageId, createdDate }) {
      if (this.isJoinedChatRoom(this.currentChatRoomId)) {
        sbp('state/vuex/commit', 'setChatRoomUnreadSince', {
          chatRoomId: this.currentChatRoomId,
          messageId,
          createdDate
        })
      }
    },
    listenChatRoomActions ({ hash }) {
      const isAddedNewMessage = (message: GIMessage): boolean => {
        const { action, meta } = message.decryptedValue()
        const rootState = sbp('state/vuex/state')
        const me = rootState.loggedIn.username

        if (/.*(addMessage|join|rename|changeDescription|leave)$/.test(action)) {
          // we add new pending message in 'handleSendMessage' function so we skip when I added a new message
          return { added: true, self: me === meta.username }
        }

        return { added: false, self: false }
      }

      sbp('okTurtles.events/once', hash, async (contractID, message) => {
        if (contractID === this.currentChatRoomId) {
          const state = this.getSimulatedState(false)
          await sbp('chelonia/private/in/processMessage', message, state)
          this.latestEvents.push(message.serialize())

          this.$forceUpdate()

          // TODO: Need to scroll to the bottom only when new message is ADDED by ANOTHER
          if (this.ephemeral.scrolledDistance < 50) {
            const { added, self } = isAddedNewMessage(message)
            if (added) {
              const isScrollable = this.$refs.conversation &&
                this.$refs.conversation.scrollHeight !== this.$refs.conversation.clientHeight
              if (!self && isScrollable) {
                this.updateScroll()
              } else if (!isScrollable) {
                const msg = this.messages[this.messages.length - 1]
                this.updateUnreadMessageId({
                  messageId: msg.id,
                  createdDate: msg.datetime
                })
              }
            }
          }
        }
      })
    },
    resizeEventHandler () {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    },
    infiniteHandler ($state) {
      this.ephemeral.infiniteLoading = $state
      this.renderMoreMessages(this.shouldRefreshMessages).then(completed => {
        if (completed) {
          $state.complete()
          if (!this.$refs.conversation ||
            this.$refs.conversation.scrollHeight === this.$refs.conversation.clientHeight) {
            const msg = this.messages[this.messages.length - 1]
            this.updateUnreadMessageId({
              messageId: msg.id,
              createdDate: msg.datetime
            })
          }
        } else {
          $state.loaded()
        }
        this.shouldRefreshMessages = false
      })
    },
    onChatScroll: debounce(function () {
      if (!this.$refs.conversation) {
        return
      }
      // Because of infinite-scroll this is not calculated in scrollheight
      // 117 is the height of `conversation-greetings` component
      const topOffset = 117
      const curScrollTop = this.$refs.conversation.scrollTop
      const curScrollBottom = curScrollTop + this.$refs.conversation.clientHeight
      if (!this.$refs.conversation) {
        this.ephemeral.scrolledDistance = 0
      } else {
        const scrollTopMax = this.$refs.conversation.scrollHeight - this.$refs.conversation.clientHeight
        this.ephemeral.scrolledDistance = scrollTopMax - curScrollTop
      }

      if (!this.summary.joined) {
        return
      }

      for (let i = this.messages.length - 1; i >= 0; i--) {
        const msg = this.messages[i]
        const offsetTop = this.$refs[msg.id][0].$el.offsetTop
        const parentOffsetTop = this.$refs[msg.id][0].$el.offsetParent.offsetTop
        if (offsetTop - parentOffsetTop + topOffset <= curScrollBottom) {
          const bottomMessageCreatedAt = new Date(msg.datetime).getTime()
          const latestMessageCreatedAt = this.currentChatRoomUnreadSince?.createdDate
          if (!latestMessageCreatedAt || new Date(latestMessageCreatedAt).getTime() <= bottomMessageCreatedAt) {
            this.updateUnreadMessageId({
              messageId: msg.id,
              createdDate: msg.datetime
            })
          }
          break
        }
      }

      if (this.ephemeral.scrolledDistance > 500) {
        // Save the current scroll position per each chatroom
        for (let i = 0; i < this.messages.length - 1; i++) {
          const msg = this.messages[i]
          const offsetTop = this.$refs[msg.id][0].$el.offsetTop
          const parentOffsetTop = this.$refs[msg.id][0].$el.offsetParent.offsetTop
          if (offsetTop - parentOffsetTop + topOffset >= curScrollTop) {
            sbp('state/vuex/commit', 'setChatRoomScrollPosition', {
              chatRoomId: this.currentChatRoomId,
              messageId: this.messages[i + 1].id // Leave one(+1) message at the front by default for better seeing
            })
            break
          }
        }
      } else if (this.currentChatRoomScrollPosition) {
        sbp('state/vuex/commit', 'setChatRoomScrollPosition', {
          chatRoomId: this.currentChatRoomId,
          messageId: null
        })
      }
    }, 500)
  },
  watch: {
    currentChatRoomId (to, from) {
      const force = !!sbp('okTurtles.data/get', 'JOINING_CHATROOM_ID')
      this.setMessageEventListener({ from, to, force })
      this.setInitMessages()
    },
    'summary.joined' (to, from) {
      if (to) {
        sbp('okTurtles.events/once', CONTRACT_IS_SYNCING, (contractID, isSyncing) => {
          if (contractID === this.currentChatRoomId && isSyncing === false) {
            this.setInitMessages()
            this.setMessageEventListener({ force: true })
          }
        })
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-chat-main {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 10px;
}

.c-body {
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  justify-content: flex-end;
  height: calc(var(--vh, 1vh) * 100 - 16rem);
  width: calc(100% + 1rem);
  position: relative;

  @include tablet {
    height: calc(var(--vh, 1vh) * 100 - 14rem);
  }

  &::before {
    content: "";
    width: 100%;
    height: 2.5rem;
    position: absolute;
    z-index: 1;
    top: 0;
    background: linear-gradient(180deg, $background_0 0%, $background_0_opacity_0 100%);
  }
}

.c-body-conversation {
  margin-right: 1rem;
  padding: 2rem 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.c-divider {
  text-align: center;
  position: relative;
  margin: 1rem 0;

  span {
    background: $background_0;
    position: relative;
    padding: 0.5rem;
    color: $text_1;
    font-size: $size_5;

    + .c-new {
      position: absolute;
      right: 0;
      top: -0.3rem;
    }
  }

  &::before {
    content: "";
    height: 1px;
    width: 100%;
    background-color: $general_0;
    position: absolute;
    left: 0;
    top: 50%;
  }

  &.is-new {
    span {
      color: $primary_0;
    }

    &::before {
      background-color: $primary_0;
    }
  }

  .c-new {
    font-weight: bold;
  }
}
</style>
