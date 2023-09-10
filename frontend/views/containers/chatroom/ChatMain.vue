<template lang='pug'>
.c-chat-main(v-if='summary.title')
  emoticons

  .c-body
    .c-body-conversation(
      ref='conversation'
      data-test='conversationWrapper'
      @scroll='onChatScroll'
      :class='{"c-invisible": !ephemeral.messagesInitiated}'
    )

      infinite-loading(
        direction='top'
        slot='append'
        @infinite='infiniteHandler'
        force-use-infinite-wrapper='.c-body-conversation'
      )
        div(slot='no-more')
          conversation-greetings(
            :members='summary.numberOfUsers'
            :creator='summary.attributes.creator'
            :type='summary.attributes.type'
            :joined='summary.isJoined'
            :name='summary.title'
            :description='summary.attributes.description'
          )
        div(slot='no-results')
          conversation-greetings(
            :members='summary.numberOfUsers'
            :creator='summary.attributes.creator'
            :type='summary.attributes.type'
            :joined='summary.isJoined'
            :name='summary.title'
            :description='summary.attributes.description'
          )

      div(v-for='(message, index) in messages' :key='index')
        .c-divider(
          v-if='changeDay(index) || isNew(message.hash)'
          :class='{"is-new": isNew(message.hash)}'
        )
          i18n.c-new(v-if='isNew(message.hash)' :class='{"is-new-date": changeDay(index)}') New
          span(v-else-if='changeDay(index)') {{proximityDate(message.datetime)}}

        component(
          :is='messageType(message)'
          :ref='message.hash'
          :messageId='message.id'
          :messageHash='message.hash'
          :text='message.text'
          :type='message.type'
          :notification='message.notification'
          :proposal='message.proposal'
          :pollData='message.pollData'
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
          @scroll-to-replying-message='scrollToMessage(message.replyingMessage.hash)'
          @edit-message='(newMessage) => editMessage(message, newMessage)'
          @delete-message='deleteMessage(message)'
          @add-emoticon='addEmoticon(message, $event)'
        )

    .c-initializing(v-if='!ephemeral.messagesInitiated')
    //-   TODO later - Design a cool skeleton loading
    //-   this should be done only after knowing exactly how server gets each conversation data

  .c-footer
    send-area(
      v-if='summary.isJoined'
      :loading='!ephemeral.messagesInitiated'
      :replying-message='ephemeral.replyingMessage'
      :replying-to='ephemeral.replyingTo'
      :scrolledUp='isScrolledUp'
      @send='handleSendMessage'
      @jump-to-latest='updateScroll'
      @stop-replying='stopReplying'
    )
    view-area(
      v-else
      :joined='summary.isJoined'
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
import MessagePoll from './MessagePoll.vue'
import ConversationGreetings from '@containers/chatroom/ConversationGreetings.vue'
import SendArea from './SendArea.vue'
import ViewArea from './ViewArea.vue'
import Emoticons from './Emoticons.vue'
import {
  MESSAGE_TYPES,
  MESSAGE_VARIANTS,
  CHATROOM_ACTIONS_PER_PAGE,
  CHATROOM_MAX_ARCHIVE_ACTION_PAGES
} from '@model/contracts/shared/constants.js'
import { findMessageIdx } from '@model/contracts/shared/functions.js'
import { proximityDate, MINS_MILLIS } from '@model/contracts/shared/time.js'
import { cloneDeep, debounce } from '@model/contracts/shared/giLodash.js'
import { CONTRACT_IS_SYNCING, EVENT_HANDLED } from '~/shared/domains/chelonia/events.js'

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
    MessagePoll,
    SendArea,
    ViewArea
  },
  props: {
    summary: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      config: {
        isPhone: null
      },
      latestEvents: [],
      ephemeral: {
        startedUnreadMessageHash: null,
        scrolledDistance: 0,
        infiniteLoading: null,
        // NOTE: messagesInitiated describes if the messages are fully re-rendered
        //       according to this, we could display loading/skeleton component
        messagesInitiated: undefined,
        replyingMessage: null,
        replyingMessageHash: null,
        replyingTo: null
      },
      messageState: {
        contract: {},
        prevFrom: null,
        prevTo: null
      }
    }
  },
  created () {
    // TODO: #492 create a global Vue Responsive just for media queries.
    this.matchMediaPhone = window.matchMedia('screen and (max-width: 639px)')
    this.matchMediaPhone.onchange = (e) => {
      this.config.isPhone = e.matches
    }
    this.config.isPhone = this.matchMediaPhone.matches
  },
  mounted () {
    if (this.currentChatRoomId && this.isJoinedChatRoom(this.currentChatRoomId)) {
      // NOTE: this.currentChatRoomId could be null when enter group chat page very soon
      //       after the first opening the Group Income application
      this.setInitMessages()
    }
    sbp('okTurtles.events/on', EVENT_HANDLED, this.listenChatRoomActions)
    window.addEventListener('resize', this.resizeEventHandler)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', EVENT_HANDLED, this.listenChatRoomActions)
    window.removeEventListener('resize', this.resizeEventHandler)
    // making sure to destroy the listener for the matchMedia istance as well
    this.matchMediaPhone.onchange = null
    this.archiveMessageState()
  },
  computed: {
    ...mapGetters([
      'currentChatRoomId',
      'chatRoomSettings',
      'chatRoomAttributes',
      'chatRoomUsers',
      'ourIdentityContractId',
      'ourUsername',
      'currentIdentityState',
      'isJoinedChatRoom',
      'setChatRoomScrollPosition',
      'currentChatRoomScrollPosition',
      'currentChatRoomReadUntil',
      'currentGroupNotifications',
      'currentChatVolatile',
      'currentChatVm',
      'chatRoomUnreadMentions'
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
    },
    messages () {
      return this.messageState.contract?.messages || []
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
      const user = this.isCurrentUser(message.from) ? this.currentUserAttr : this.summary.participants[message.from]
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
      return this.summary.participants[from]?.picture
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
      this.ephemeral.replyingMessageHash = null
      this.ephemeral.replyingTo = null
    },
    handleSendMessage (message) {
      const replyingMessage = this.ephemeral.replyingMessageHash
        ? { hash: this.ephemeral.replyingMessageHash, text: this.ephemeral.replyingMessage }
        : null
      // Consider only simple TEXT now
      // TODO: implement other types of messages later
      const data = { type: MESSAGE_TYPES.TEXT, text: message }

      // TODO: Unhandled rejection
      sbp('gi.actions/chatroom/addMessage', {
        contractID: this.currentChatRoomId,
        data: !replyingMessage ? data : { ...data, replyingMessage },
        hooks: {
          prepublish: (message) => {
            sbp('chelonia/in/processMessage', message, this.messageState.contract).then((state) => {
              this.messageState.contract = state
            }).catch((e) => {
              console.error('Error sending message during pre-publish: ' + e.message)
            })
            this.stopReplying()
            this.updateScroll()
          }
        }
      })
    },
    async scrollToMessage (messageHash, effect = true) {
      if (!messageHash || !this.messages.length) {
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

      const msgIndex = findMessageIdx(messageHash, this.messages)
      if (msgIndex >= 0) {
        scrollAndHighlight(msgIndex)
      } else {
        const limit = this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE
        const events = await sbp('chelonia/out/eventsBetween', messageHash, this.messages[0].hash, limit / 2)
        if (events && events.length) {
          await this.rerenderEvents(events, false)

          const msgIndex = findMessageIdx(messageHash, this.messages)
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
    updateScroll (scrollTargetMessage = null, effect = false) {
      if (this.summary.title) {
        // force conversation viewport to be at the bottom (most recent messages)
        setTimeout(() => {
          if (scrollTargetMessage) {
            this.scrollToMessage(scrollTargetMessage, effect)
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
      this.ephemeral.replyingMessageHash = message.hash
      this.ephemeral.replyingTo = this.who(message)
    },
    editMessage (message, newMessage) {
      message.text = newMessage
      message.pending = true
      // TODO: Unhandled rejection
      sbp('gi.actions/chatroom/editMessage', {
        contractID: this.currentChatRoomId,
        data: {
          hash: message.hash,
          createdDate: message.datetime,
          text: newMessage
        }
      })
    },
    deleteMessage (message) {
      // TODO: Unhandled rejection
      sbp('gi.actions/chatroom/deleteMessage', {
        contractID: this.currentChatRoomId,
        data: { hash: message.hash }
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
    isNew (msgHash) {
      return this.ephemeral.startedUnreadMessageHash === msgHash
    },
    addEmoticon (message, emoticon) {
      // TODO: Unhandled rejection
      sbp('gi.actions/chatroom/makeEmotion', {
        contractID: this.currentChatRoomId,
        data: { hash: message.hash, emoticon }
      })
    },
    initializeState () {
      // NOTE: this state is rendered using the chatroom contract functions
      // so should be CAREFUL of updating the fields
      this.messageState.contract = {
        settings: cloneDeep(this.chatRoomSettings),
        attributes: cloneDeep(this.chatRoomAttributes),
        users: cloneDeep(this.chatRoomUsers),
        _vm: cloneDeep(this.currentChatVm),
        messages: [],
        onlyRenderMessage: true // NOTE: DO NOT RENAME THIS OR CHATROOM WOULD BREAK
      }
    },
    async renderMoreMessages (shouldInitiate = true) {
      // NOTE: shouldInitiate describes if the messages should be fully removed and re-rendered
      //       it's true when user gets entered channel page or switches to another channel
      if (shouldInitiate) {
        await this.loadMessagesFromStorage()
      }
      const limit = this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE
      /***
       * if the removed message was the first unread messages(currentChatRoomReadUntil)
       * we can load message of that hash(messageHash) but not scroll
       * because it doesn't exist in this.messages
       * So in this case, we will load messages until the first unread mention
       * and scroll to that message
       */
      const curChatRoomId = this.currentChatRoomId
      let unreadPosition = null
      if (this.currentChatRoomReadUntil) {
        if (!this.currentChatRoomReadUntil.deletedDate) {
          unreadPosition = this.currentChatRoomReadUntil.messageHash
        } else if (this.chatRoomUnreadMentions(this.currentChatRoomId).length) {
          unreadPosition = this.chatRoomUnreadMentions(this.currentChatRoomId)[0].messageHash
        }
      }
      const {
        mhash = '' // mhash is a query for scrolling to a particular message when chat-room is done with the initial render. (refer to 'copyMessageLink' method in MessageBase.vue)
      } = this.$route.query
      const messageHashToScroll = mhash || this.currentChatRoomScrollPosition || unreadPosition
      const { HEAD: latestHash } = await sbp('chelonia/out/latestHEADInfo', this.currentChatRoomId)
      const before = shouldInitiate || !this.latestEvents.length
        ? latestHash
        : GIMessage.deserialize(this.latestEvents[0]).hash()
      let events = []
      const isLoadedFromStorage = shouldInitiate && this.latestEvents.length
      if (isLoadedFromStorage) {
        const prevLastEventHash = this.messageState.prevTo // NOTE: check loadMessagesFromStorage function
        let newEvents = []
        if (latestHash !== prevLastEventHash) {
          newEvents = await sbp('chelonia/out/eventsBetween', prevLastEventHash, latestHash, 0)
          newEvents.shift() // NOTE: already exists in this.latestEvents
        }
        if (newEvents.length) {
          for (const event of newEvents) {
            this.messageState.contract = await sbp('chelonia/in/processMessage', GIMessage.deserialize(event, undefined, this.messageState.contract), this.messageState.contract)
            this.latestEvents.push(event)
          }
          this.$forceUpdate()
        }
      } else if (shouldInitiate && messageHashToScroll) {
        events = await sbp('chelonia/out/eventsBetween', messageHashToScroll, latestHash, limit)
      } else {
        events = await sbp('chelonia/out/eventsBefore', before, limit)
      }
      if (curChatRoomId !== this.currentChatRoomId) {
        // NOTE: To avoid rendering the incorrect events for the currentChatRoom
        // While getting the events from the backend, this.currentChatRoomId could be changed
        // In this case, we should avoid the previous events because they are for another channel, not the current channel
        return
      }

      if (!isLoadedFromStorage) {
        // NOTE: already rendered above in this function
        await this.rerenderEvents(events, shouldInitiate)
      }

      if (shouldInitiate) {
        this.setStartNewMessageIndex()
        this.updateScroll(messageHashToScroll, Boolean(mhash)) // We do want the 'c-focused' animation if there is a message-scroll query.
        return false
      }

      return events.length < limit
    },
    async rerenderEvents (events, shouldInitiate) {
      if (shouldInitiate) {
        this.latestEvents = events
      } else if (events.length > 1) {
        events.pop() // remove duplication. For more detail, check sbp('chelonia/out/eventsBetween')
        this.latestEvents.unshift(...events)
      } else {
        return
      }

      this.initializeState()
      for (const event of this.latestEvents) {
        this.messageState.contract = await sbp('chelonia/in/processMessage', GIMessage.deserialize(event, undefined, this.messageState.contract), this.messageState.contract)
      }
      this.$forceUpdate()
    },
    async loadMessagesFromStorage () {
      const prevState = await sbp('gi.db/archive/load', this.archiveKeyFromChatRoomId())
      const latestEvents = prevState ? JSON.parse(prevState) : []
      this.messageState.prevFrom = latestEvents.length ? GIMessage.deserialize(latestEvents[0]).hash() : null
      this.messageState.prevTo = latestEvents.length
        ? GIMessage.deserialize(latestEvents[latestEvents.length - 1]).hash()
        : null

      await this.rerenderEvents(latestEvents, true)
    },
    setInitMessages () {
      this.initializeState()
      this.ephemeral.messagesInitiated = false
      if (this.ephemeral.infiniteLoading) {
        this.ephemeral.infiniteLoading.reset()
      }
    },
    setStartNewMessageIndex () {
      this.ephemeral.startedUnreadMessageHash = null
      if (this.currentChatRoomReadUntil) {
        const startUnreadMessage = this.messages
          .find(msg => new Date(msg.datetime).getTime() > new Date(this.currentChatRoomReadUntil.createdDate).getTime())
        if (startUnreadMessage) {
          this.ephemeral.startedUnreadMessageHash = startUnreadMessage.hash
        }
      }
    },
    updateUnreadMessageHash ({ messageHash, createdDate }) {
      if (this.isJoinedChatRoom(this.currentChatRoomId)) {
        sbp('state/vuex/commit', 'setChatRoomReadUntil', {
          chatRoomId: this.currentChatRoomId,
          messageHash,
          createdDate
        })
      }
    },
    async listenChatRoomActions (contractID: string, message: GIMessage) {
      // We must check this.summary.chatRoomId and not this.currentChatRoomId
      // because they might be different, as this.summary is computed from
      // this.currentChatRoomId.
      // The watch below will ensure that this.messageState.contract is correct
      // for the current contract, which is needed for signature verification
      // when calling processMessage.
      // The watch is setup for this.summary and not for this.currentChatRoomId,
      // which is why this check must also check for this.summary.chatRoomId
      if (contractID !== this.summary.chatRoomId) {
        return
      }

      const isMessageAddedOrDeleted = (message: GIMessage) => {
        if (![GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_ACTION_UNENCRYPTED].includes(message.opType())) return {}

        // TODO: Avoid .decryptedValue().valueOf() because apart from looking
        // funny it also discards information about the signature, which is
        // necessary to validate the sender of the message
        const { action, meta } = message.decryptedValue().valueOf()
        const rootState = sbp('state/vuex/state')
        let addedOrDeleted = 'NONE'

        if (/(addMessage|join|rename|changeDescription|leave)$/.test(action)) {
          // we add new pending message in 'handleSendMessage' function so we skip when I added a new message
          addedOrDeleted = 'ADDED'
        } else if (/(deleteMessage)$/.test(action)) {
          addedOrDeleted = 'DELETED'
        }

        return { addedOrDeleted, self: rootState.loggedIn.username === meta.username }
      }

      // NOTE: while syncing the chatroom contract, we should ignore all the events
      const { addedOrDeleted, self } = isMessageAddedOrDeleted(message)

      if (addedOrDeleted === 'DELETED') {
        // NOTE: Message will be deleted in processMessage function
        //       but need to make animation to delete it, probably here
        const messageHash = message.decryptedValue().data.hash
        const msgIndex = findMessageIdx(messageHash, this.messages)
        document.querySelectorAll('.c-body-conversation > .c-message')[msgIndex]?.classList.add('c-disappeared')

        // NOTE: waiting for the animation is done
        //       it's duration is 500ms described in MessageBase.vue
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (contractID !== this.summary.chatRoomId) {
        console.info(`Received an event for contract ID ${contractID}, but we're currently in chatroom ID ${this.summary.chatRoomId}; avoiding any further processing`)
        return
      }
      this.messageState.contract = await sbp('chelonia/in/processMessage', message, this.messageState.contract)

      this.latestEvents.push(message.serialize())

      this.$forceUpdate()

      if (this.ephemeral.scrolledDistance < 50) {
        if (addedOrDeleted === 'ADDED') {
          const isScrollable = this.$refs.conversation &&
            this.$refs.conversation.scrollHeight !== this.$refs.conversation.clientHeight
          if (!self && isScrollable) {
            this.updateScroll()
          } else if (!isScrollable && this.messages.length) {
            const msg = this.messages[this.messages.length - 1]
            this.updateUnreadMessageHash({
              messageHash: msg.hash,
              createdDate: msg.datetime
            })
          }
        }
      }
    },
    resizeEventHandler () {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    },
    infiniteHandler ($state) {
      this.ephemeral.infiniteLoading = $state
      if (this.ephemeral.messagesInitiated === undefined) {
        // NOTE: this infinite handler is being called once which should be ignored
        // before calling the setInitMessages function
        return
      }
      this.renderMoreMessages(!this.ephemeral.messagesInitiated).then(completed => {
        if (completed) {
          $state.complete()
          if (!this.$refs.conversation ||
            this.$refs.conversation.scrollHeight === this.$refs.conversation.clientHeight) {
            const msg = this.messages[this.messages.length - 1]
            if (msg) {
              this.updateUnreadMessageHash({
                messageHash: msg.hash,
                createdDate: msg.datetime
              })
            }
          }
        } else {
          $state.loaded()
        }
        this.ephemeral.messagesInitiated = true
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

      if (!this.summary.isJoined) {
        return
      }

      for (let i = this.messages.length - 1; i >= 0; i--) {
        const msg = this.messages[i]
        const offsetTop = this.$refs[msg.hash][0].$el.offsetTop
        const parentOffsetTop = this.$refs[msg.hash][0].$el.offsetParent.offsetTop
        if (offsetTop - parentOffsetTop + topOffset <= curScrollBottom) {
          const bottomMessageCreatedAt = new Date(msg.datetime).getTime()
          const latestMessageCreatedAt = this.currentChatRoomReadUntil?.createdDate
          if (!latestMessageCreatedAt || new Date(latestMessageCreatedAt).getTime() <= bottomMessageCreatedAt) {
            this.updateUnreadMessageHash({
              messageHash: msg.hash,
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
          const offsetTop = this.$refs[msg.hash][0].$el.offsetTop
          const parentOffsetTop = this.$refs[msg.hash][0].$el.offsetParent.offsetTop
          if (offsetTop - parentOffsetTop + topOffset >= curScrollTop) {
            sbp('state/vuex/commit', 'setChatRoomScrollPosition', {
              chatRoomId: this.currentChatRoomId,
              messageHash: this.messages[i + 1].hash // Leave one(+1) message at the front by default for better seeing
            })
            break
          }
        }
      } else if (this.currentChatRoomScrollPosition) {
        sbp('state/vuex/commit', 'setChatRoomScrollPosition', {
          chatRoomId: this.currentChatRoomId,
          messageHash: null
        })
      }
    }, 500),
    archiveMessageState () {
      // Copy of a reference to this.latestEvents to ensure it doesn't change
      const latestEvents = this.latestEvents
      if (latestEvents.length === 0) {
        return
      }
      const unit = this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE
      const fromEvent = GIMessage.deserialize(latestEvents[0])
      const toEvent = GIMessage.deserialize(latestEvents[latestEvents.length - 1])

      // Get the chatroom ID from the event to ensure that it's consistent with
      // what will be stored
      const chatRoomId = fromEvent.contractID()

      if (!this.isJoinedChatRoom(chatRoomId)) return

      const from = fromEvent.hash()
      const to = toEvent.hash()

      // NOTE: save messages in the browser storage, but not more than CHATROOM_MAX_ARCHIVE_ACTION_PAGES pages of events
      if (latestEvents.length >= CHATROOM_MAX_ARCHIVE_ACTION_PAGES * unit) {
        sbp('gi.db/archive/delete', this.archiveKeyFromChatRoomId(chatRoomId))
      } else if (to !== this.messageState.prevTo || from !== this.messageState.prevFrom) {
        // this.currentChatRoomId could be wrong when the channels are switched very fast
        // so it's good to initiate using input parameter chatRoomId
        sbp('gi.db/archive/save', this.archiveKeyFromChatRoomId(chatRoomId), JSON.stringify(latestEvents))
      }
    },
    archiveKeyFromChatRoomId (chatRoomId) {
      const curChatRoomId = chatRoomId || this.currentChatRoomId
      return `messages/${this.ourUsername}/${curChatRoomId}`
    },
    refreshContent: debounce(function () {
      // NOTE: using debounce we can skip unnecessary rendering contents
      this.archiveMessageState()
      this.setInitMessages()
    }, 250)
  },
  provide () {
    return {
      chatMessageUtils: {
        scrollToMessage: this.scrollToMessage
      }
    }
  },
  watch: {
    'summary' (to, from) {
      const toChatRoomId = to.chatRoomId
      const fromChatRoomId = from.chatRoomId
      const toIsJoined = to.isJoined
      const fromIsJoined = from.isJoined

      if (toChatRoomId !== fromChatRoomId) {
        this.initializeState()
      }

      const initAfterSynced = (toChatRoomId, fromChatRoomId) => {
        const initMessagesAfterSynced = (contractID, isSyncing) => {
          if (contractID === toChatRoomId && isSyncing === false) {
            this.setInitMessages()
            sbp('okTurtles.events/off', CONTRACT_IS_SYNCING, initMessagesAfterSynced)
          }
        }

        sbp('okTurtles.events/off', CONTRACT_IS_SYNCING, initMessagesAfterSynced)
        sbp('okTurtles.events/on', CONTRACT_IS_SYNCING, initMessagesAfterSynced)
      }

      if (toChatRoomId !== fromChatRoomId) {
        this.ephemeral.messagesInitiated = false
        if (sbp('chelonia/contract/isSyncing', toChatRoomId)) {
          this.archiveMessageState()
          toIsJoined && initAfterSynced(toChatRoomId, fromChatRoomId)
        } else {
          this.refreshContent(toChatRoomId, fromChatRoomId)
        }
      } else if (toIsJoined && toIsJoined !== fromIsJoined) {
        if (sbp('chelonia/contract/isSyncing', toChatRoomId)) {
          initAfterSynced(toChatRoomId, fromChatRoomId) // NOTE: toChatRoomId equals to fromChatRoomId here
        } else {
          this.setInitMessages()
        }
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
  width: calc(100% + 1rem);
  position: relative;
  min-height: 0;

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
  padding: 2rem 0 1rem 0;
  overflow: hidden auto;
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

.c-footer {
  flex-shrink: 0;
}

.c-invisible {
  visibility: hidden;
}

.c-initializing {
  position: absolute;
  width: calc(100% - 1rem);
  height: 3rem;

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 2rem;
    height: 2rem;
    border: 2px solid;
    border-top-color: transparent;
    border-radius: 50%;
    color: $general_0;
    animation: loadSpin 1.75s infinite linear;
  }
}
</style>
