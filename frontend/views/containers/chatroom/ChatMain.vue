<template lang='pug'>
.c-chat-main(
  :class='{ "is-dnd-active": dndState && dndState.isActive }'
  @dragover='dragStartHandler'
)
  drag-active-overlay(
    v-if='dndState && dndState.isActive'
    @drag-ended='dragEndHandler'
  )

  emoticons

  touch-link-helper

  .c-body
    dynamic-scroller.c-body-conversation(
      :items='ephemeral.messages'
      :min-item-size='54'
      key-field='hash'
      @scroll-start='onScrollStart'
      @scroll-end='onScrollEnd'
      @scroll.passive='onChatScroll'
      ref='conversation'
      data-test='conversationWrapper'
      :data-loaded='isLoaded'
      :data-length='ephemeral.messages.length'
      :class='{ "c-invisible": !ephemeral.messagesInitiated }'
    )
      template(:slot='"before"')
        //- .c-top-padding
        //- c-fill-while-invisible is used to trigger scroll-{start,end} when
        //- switching between chatrooms
        .c-fill-while-invisible(v-if='!ephemeral.messagesInitiated')
        .c-conversation-start
          conversation-greetings(
            :members='summary.numberOfMembers'
            :creatorID='summary.attributes.creatorID'
            :type='summary.attributes.type'
            :joined='summary.isJoined'
            :dm-to-myself='summary.isDMToMySelf'
            :name='summary.title'
            :description='summary.attributes.description'
            v-if='ephemeral.currentLowestHeight === 0 && !ephemeral.loadingUp'
          )
        .c-loading(v-if='ephemeral.loadingUp')
          p.sr-only {{L('Loading')}}
      template(:slot='"after"')
        .c-loading.is-bottom(v-if='ephemeral.loadingDown')
          p.sr-only {{L('Loading')}}
        div(:class='"c-conversation-end"')
      template(v-slot='{ item: message, index, active }')
        dynamic-scroller-item(
          :item='message'
          :active='active'
          :size-dependencies='[message.hash, message.text, ephemeral.isEditing[message.hash], message.from, message.type, message.attachments, message.proposal, message.pollData, message.datetime, message.updatedDate, message.emoticons, message.delete, message.notification, message.pinnedBy, message.replyingMessage]'
          :data-index='index'
        )
          .c-divider(
            v-if='changeDay(message, ephemeral.messages[index - 1]) || isNew(message.hash)'
            :class='{"is-new": isNew(message.hash)}'
            :key='`date-${index}`'
          )
            i18n.c-new(v-if='isNew(message.hash)' :class='{"is-new-date": changeDay(message, ephemeral.messages[index - 1])}') New
            span(v-else-if='changeDay(message, ephemeral.messages[index - 1])') {{proximityDate(message.datetime)}}

          component(
            :is='messageType(message)'
            :ref='message.hash'
            :key='message.hash'
            :height='message.height'
            :messageId='message.id'
            :messageHash='message.hash'
            :from='message.from'
            :text='message.text'
            :attachments='message.attachments'
            :type='message.type'
            :notification='message.notification'
            :proposal='message.proposal'
            :pollData='message.pollData'
            :replyingMessage='replyingMessageText(message)'
            :datetime='time(message.datetime)'
            :edited='!!message.updatedDate'
            :updatedDate='message.updatedDate'
            :emoticonsList='message.emoticons'
            :who='who(message)'
            :currentUserID='currentUserAttr.id'
            :avatar='avatar(message.from)'
            :variant='variant(message)'
            :pinnedBy='message.pinnedBy'
            :isSameSender='isSameSender(message, ephemeral.messages[index - 1])'
            :isMsgSender='isMsgSender(message.from)'
            :isFocused='message.hash === ephemeral.focusedEffect'
            :isGroupCreator='isGroupCreator'
            :isEditing='ephemeral.isEditing[message.hash]'
            :uploadingAttachments='ephemeral.uploadingAttachments[message.hash]'
            :class='{removed: message.delete}'
            @message-is-editing='status => triggerEditMessage(message.hash, status)'
            @retry='retryMessage(message)'
            @reply='replyToMessage(message)'
            @scroll-to-replying-message='scrollToMessage(message.replyingMessage.hash)'
            @edit-message='(newMessage) => editMessage(message, newMessage)'
            @pin-to-channel='pinToChannel(message)'
            @unpin-from-channel='unpinFromChannel(message.hash)'
            @delete-message='deleteMessage(message)'
            @delete-attachment='manifestCid => deleteAttachment(message, manifestCid)'
            @add-emoticon='addEmoticon(message, $event)'
          )

    .c-initializing(v-if='!ephemeral.messagesInitiated')
    //-   TODO later - Design a cool skeleton loading
    //-   this should be done only after knowing exactly how server gets each conversation data

  .c-footer
    send-area(
      ref='sendArea'
      v-if='summary.isJoined'
      :loading='!ephemeral.messagesInitiated'
      :replyingMessage='ephemeral.replyingMessage'
      :replyingTo='ephemeral.replyingTo'
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

  //-  portal-target that can be used as a container for various overlay UI components in chat. (eg. MessageActions.vue in mobile-screen)
  //-  In iOS safari, css 'position: fixed' does not behave consistently when the element is placed deep in the DOM tree, where one of the ancestor has css 'transform' property.
  //-  We use 'portal-vue' plugin(https://v2.portal-vue.linusb.org/guide/getting-started.html) to resolve this issue by teleporting the UI here, so that 'position: fixed' works as expected.
  //-  (Reference issue: https://github.com/okTurtles/group-income/issues/2476)
  //- portal-target(name='chat-overlay-target' class='chat-overlay-target')
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { SPMessage } from '@chelonia/lib/SPMessage'
import { L, LError } from '@common/common.js'
import Vue from 'vue'
import Avatar from '@components/Avatar.vue'
import Message from './Message.vue'
import MessageInteractive, { interactiveMessage } from './MessageInteractive.vue'
import MessageNotification from './MessageNotification.vue'
import MessagePoll from './MessagePoll.vue'
import ConversationGreetings from '@containers/chatroom/ConversationGreetings.vue'
import SendArea from './SendArea.vue'
import ViewArea from './ViewArea.vue'
import Emoticons from './Emoticons.vue'
import TouchLinkHelper from './TouchLinkHelper.vue'
import DragActiveOverlay from './file-attachment/DragActiveOverlay.vue'
import {
  MESSAGE_TYPES, MESSAGE_VARIANTS,
  CHATROOM_ACTIONS_PER_PAGE,
  CHATROOM_MEMBER_MENTION_SPECIAL_CHAR,
  CHATROOM_REPLYING_MESSAGE_LIMITS_IN_CHARS
} from '@model/contracts/shared/constants.js'
import {
  CHATROOM_EVENTS, NEW_CHATROOM_SCROLL_POSITION,
  DELETE_ATTACHMENT_FEEDBACK, CHATROOM_CANCEL_UPLOAD_ATTACHMENTS
} from '@utils/events.js'
import { findMessageIdx } from '@model/contracts/shared/functions.js'
import { proximityDate, MINS_MILLIS } from '@model/contracts/shared/time.js'
import { cloneDeep, debounce, throttle, delay } from 'turtledash'
import { EVENT_HANDLED } from '@chelonia/lib/events'
import { compressImage } from '@utils/image.js'
import { swapMentionIDForDisplayname, makeMentionFromUserID } from '@model/chatroom/utils.js'
import DynamicScroller from '@components/vue-virtual-scroller/DynamicScroller.vue'
import DynamicScrollerItem from '@components/vue-virtual-scroller/DynamicScrollerItem.vue'

const ignorableScrollDistanceInPixel = 500

const enqueue = function (fn) {
  const chatroomID = this.ephemeral.renderingChatRoomId
  return sbp('okTurtles.eventQueue/queueEvent', CHATROOM_EVENTS, () => {
    if (this.chatroomHasSwitchedFrom(chatroomID)) return

    return fn()
  })
}

// The following methods are wrapped inside `debounce`, which requires calling
// flush before the references used go away, like when switching groups.
// Vue.js binds methods, which means that properties like `.flush` become
// inaccessible. So, instead we define these methods outside the component and
// manually bind them in `mounted`.
const onChatScroll = function (ev) {
  // NOTE: Should be careful of using the currentChatRoomState
  //       since those states are depends on the currentChatRoomId, not renderingChatRoomId
  if (!this.$refs.conversation || !this.summary.isJoined || !this.ephemeral.messages.length) {
    return
  }

  const curScrollTop = this.$refs.conversation.$el.scrollTop
  // const curScrollBottom = curScrollTop + this.$refs.conversation.$el.clientHeight
  const scrollTopMax = this.$refs.conversation.$el.scrollHeight - this.$refs.conversation.$el.clientHeight
  // const scroller = this.$refs.conversation.$refs.scroller
  this.ephemeral.scrollableDistance = scrollTopMax - curScrollTop

  if (curScrollTop < 5) {
    this.onScrollStart()
  } else if (curScrollTop + 5 > scrollTopMax) {
    this.onScrollEnd()
  }

  // `(scroller?.$_startIndex ?? 0)`` is more efficient if using vue-virtual-scroller
  const firstMessageIndex = 0
  // `(scroller?.$_endIndex ?? this.ephemeral.messages.length) - 1` would be
  // more efficient if using vue-virtual-scroller
  const lastMesageIndex = this.ephemeral.messages.length - 1

  for (let i = lastMesageIndex; i >= firstMessageIndex; i--) {
    const msg = this.ephemeral.messages[i]
    if (msg.pending || msg.hasFailed || !this.$refs[msg.hash]?.$el) continue
    if (this.isMessageVisible(msg.hash)) {
      const bottomMessageCreatedHeight = msg.height
      const latestMessageCreatedHeight = this.currentChatRoomReadUntil?.createdHeight
      // No need to check for pending here as it's checked above
      if (!latestMessageCreatedHeight || latestMessageCreatedHeight <= bottomMessageCreatedHeight) {
        this.updateReadUntilMessageHash({
          messageHash: msg.hash,
          createdHeight: msg.height
        })
      }
      break
    }
  }

  if (!this.ephemeral.messagesInitiated && this.ephemeral.renderingChatRoomId) {
    return
  }

  if (this.ephemeral.scrollableDistance > ignorableScrollDistanceInPixel) {
    // Save the current scroll position per each chatroom
    const iterator = this.visibleMessageIterator()
    for (const msg of iterator) {
      if (msg.pending || msg.hasFailed) continue

      if (msg.hash !== this.currentChatRoomScrollPosition) {
        sbp('okTurtles.events/emit', NEW_CHATROOM_SCROLL_POSITION, {
          chatRoomID: this.ephemeral.renderingChatRoomId,
          messageHash: msg.hash
        })
      }
      break
    }
  } else if (this.currentChatRoomScrollPosition && this.ephemeral.currentHighestHeight === this.latestHeight) {
    sbp('okTurtles.events/emit', NEW_CHATROOM_SCROLL_POSITION, {
      chatRoomID: this.ephemeral.renderingChatRoomId,
      messageHash: null
    })
  }
}

const onScrollStart = function () {
  const conversation = this.$refs.conversation?.$el

  if (conversation?.scrollTop < 5) {
    this.onScrollEvt('up')
  }
}

const onScrollEnd = function () {
  const conversation = this.$refs.conversation?.$el

  if (conversation && conversation.clientHeight + (conversation.scrollTop + 5) > conversation.scrollHeight) {
    this.onScrollEvt('down')
  }
}

export default ({
  name: 'ChatMain',
  components: {
    Avatar,
    ConversationGreetings,
    Emoticons,
    DynamicScroller,
    DynamicScrollerItem,
    TouchLinkHelper,
    Message,
    MessageInteractive,
    MessageNotification,
    MessagePoll,
    SendArea,
    ViewArea,
    DragActiveOverlay
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
        // Below contains the message hash on which the user manually marked as unread
        messageHashToMarkUnread: null,
        scrollableDistance: 0,
        onChatScroll: null,
        onScrollStart: () => {},
        onScrollEnd: () => {},
        // NOTE: messagesInitiated describes if the messages are fully re-rendered
        //       according to this, we could display loading/skeleton component
        messagesInitiated: undefined,
        replyingMessage: null,
        replyingTo: null,
        unprocessedEvents: [],

        // Related to switching chatrooms
        chatroomIdToSwitchTo: null,
        renderingChatRoomId: null,

        // Related to auto-scrolling to initial position
        initialScroll: {
          hash: null,
          timeoutId: null
        },
        loadingDown: undefined,
        loadingUp: undefined,
        messages: [],
        isEditing: {},
        uploadingAttachments: {},
        scrollActionId: null,
        focusedEffect: null,
        currentLowestHeight: undefined,
        currentHighestHeight: undefined,
        // Used for non-joined chatrooms
        latestHeight: undefined
      },
      messageState: {
        // `fetched` indicates whether we've loaded messages dynamically
        // from the server. The purpose of this flag is to discriminate between
        // 'cached' messages that come directly from the root state and messages
        // that have been fetched by `ChatMain`. This is useful for taking
        // different paths and avoid unnecessarily loading messages.
        fetched: false,
        contract: {}
      },
      dndState: {
        // drag & drop releated state
        isActive: false
      }
    }
  },
  created () {
    // TODO: #492 create a global Vue Responsive just for media queries.
    this.matchMediaPhone = window.matchMedia('screen and (max-width: 768px)')
    this.matchMediaPhone.onchange = (e) => {
      this.config.isPhone = e.matches
    }
    this.config.isPhone = this.matchMediaPhone.matches
  },
  mounted () {
    // setup various event listeners.
    this.ephemeral.onChatScroll = debounce(onChatScroll.bind(this), process.env.CI ? 30 : 300)
    this.ephemeral.onScrollStart = debounce(onScrollStart.bind(this), process.env.CI ? 20 : 200)
    this.ephemeral.onScrollEnd = debounce(onScrollEnd.bind(this), process.env.CI ? 20 : 200)
    sbp('okTurtles.events/on', EVENT_HANDLED, this.listenChatRoomActions)
    window.addEventListener('resize', this.resizeEventHandler)

    if (this.summary.chatRoomID) {
      this.ephemeral.chatroomIdToSwitchTo = this.summary.chatRoomID
      this.processChatroomSwitch()
    }

    /*
    if (typeof ResizeObserver !== 'function') return
    this.resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length) return
      requestAnimationFrame(() => this.applyTopPadding())
    })
    // Mutation observer needed because resize observer won't trigger on
    // scroll height changes
    if (typeof MutationObserver === 'function') {
      this.mutationObserver = new MutationObserver((entries) => {
        if (!this.resizeObserver || !this.mutationObserver) return
        for (const entry of entries) {
          if (entry.type !== 'childList') continue
          for (const addedNode of entry.addedNodes) {
            this.resizeObserver.observe(addedNode)
          }
          for (const removedNode of entry.removedNodes) {
            this.resizeObserver.unobserve(removedNode)
          }
        }
      })
    }
    */
  },
  beforeDestroy () {
    // if (this.scrollTimeoutId != null) clearTimeout(this.scrollTimeoutId)
    // Destroy various event listeners.
    sbp('okTurtles.events/off', EVENT_HANDLED, this.listenChatRoomActions)
    window.removeEventListener('resize', this.resizeEventHandler)
    /*
    this.resizeObserver?.disconnect()
    this.mutationObserver?.disconnect()
    this.resizeObserver = null
    this.mutationObserver = null
    this.matchMediaPhone.onchange = null
    */
  },
  computed: {
    ...mapGetters([
      'currentGroupOwnerID',
      'currentChatRoomId',
      'chatRoomSettings',
      'chatRoomAttributes',
      'chatRoomMembers',
      'ourIdentityContractId',
      'currentIdentityState',
      'isJoinedChatRoom',
      'isGroupDirectMessage',
      'currentChatRoomScrollPosition',
      'currentChatRoomReadUntil',
      'isReducedMotionMode'
    ]),
    isLoaded () {
      return (
        // Initial load attempt
        this.ephemeral.messagesInitiated &&
        // No active load attemps
        !this.ephemeral.loadingUp &&
        !this.ephemeral.loadingDown &&
        // Rendering the current contract state
        this.messageState.contract.messages === this.ephemeral.messages
      )
    },
    needsFromScratch () {
      return (
        this.ephemeral.currentLowestHeight !== 0 &&
        !this.isJoinedChatRoom(this.ephemeral.renderingChatRoomId)
      )
    },
    currentUserAttr () {
      return {
        ...this.currentIdentityState.attributes,
        id: this.ourIdentityContractId
      }
    },
    isScrolledUp () {
      if (!this.ephemeral.scrollableDistance) {
        return false
      }
      return this.ephemeral.scrollableDistance > ignorableScrollDistanceInPixel
    },
    isGroupCreator () {
      if (!this.isGroupDirectMessage(this.ephemeral.renderingChatRoomId)) {
        return this.currentUserAttr.id === this.currentGroupOwnerID
      }
      return false
    },
    latestHeight () {
      if (this.ephemeral.latestHeight != null) {
        return this.ephemeral.latestHeight
      }
      const chatRoomID = this.ephemeral.renderingChatRoomId
      const contractHeight = this.$store.state.contracts[chatRoomID]?.height

      return contractHeight
    }
  },
  methods: {
    resetObservers () {
      const observeSizeChanges = () => {
        if (!this.resizeObserver) return
        if (!this.$refs.conversation?.$el) {
          setTimeout(() => this.$nextTick(observeSizeChanges), 100)
          return
        }
        if (this.mutationObserver) {
          this.mutationObserver.disconnect()
          this.mutationObserver.observe(this.$refs.conversation.$el, { childList: true })
        }
        this.resizeObserver.disconnect()
        this.resizeObserver.observe(this.$refs.conversation.$el)
        this.resizeObserver.observe(this.$refs.conversation.$el.parentElement)
      }
      observeSizeChanges()
    },
    /* applyTopPadding () {
      // Top padding used so that there's enough space to render the menu
      // options
      const conversation = this.$refs.conversation?.$el
      const conversationTP = conversation?.querySelector('.c-top-padding')
      if (!conversation || !conversationTP || !conversation.parentElement) return
      const padding = Math.max(conversation.parentElement.clientHeight - conversation.scrollHeight + conversationTP.clientHeight - 1, 0)
      conversationTP.style.height = `0.0${padding}px`
    }, */
    triggerEditMessage (hash, status) {
      if (status) {
        Vue.set(this.ephemeral.isEditing, hash, status)
        if (!this.isScrolledUp) {
          this.$nextTick(() => {
            this.jumpToLatest()
          })
        }
      } else {
        Vue.delete(this.ephemeral.isEditing, hash)
      }
    },
    setMessages: debounce(function () {
      if (!this.ephemeral.renderingChatRoomId) return
      const newMessages = this.messageState.contract?.messages || []
      if (this.ephemeral.messages === newMessages) return
      const currentVisibleMessage = this.visibleMessageIterator().next().value
      this.ephemeral.messages = newMessages
      const postSetMessageState = this.ephemeral.postSetMessageState
      delete this.ephemeral.postSetMessageState
      if (!postSetMessageState?.noRerender) {
        this.rerenderEvents(currentVisibleMessage)
      }
      if (postSetMessageState) {
        this.$nextTick(postSetMessageState)
      }
    }, process.env.CI ? 10 : 100),
    * visibleMessageIterator () {
      if (!this.$refs.conversation) return
      // The following is slightly more efficient if using `vue-virtual-scroller'
      // since then we can look at just a subset of elements
      // // const scroller = this.$refs.conversation.$refs.scroller
      // // const messages = this.ephemeral.messages.slice(scroller?.$_startIndex ?? 0, scroller?.$_endIndex ?? this.ephemeral.messages.length)
      const messages = this.ephemeral.messages

      let i = 0
      for (; i < messages.length; i++) {
        const msg = messages[i]
        if (!this.isMessageVisible(msg.hash)) continue
        yield msg
        break
      }

      for (; i < messages.length; i++) {
        const msg = messages[i]
        if (!this.isMessageVisible(msg.hash)) break
        yield msg
      }
    },
    async loadMoreMessages (chatRoomID, direction = 'down') {
      // NOTE: 'this.ephemeral.renderingChatRoomId' can be changed while running this function
      //       we save it in the contant variable 'chatRoomID'
      //       'this.ephemeral.messagesInitiated' describes if the messages should be fully removed and re-rendered
      //       it's true when user gets entered channel page or switches to another channel
      if (!chatRoomID || this.chatroomHasSwitchedFrom(chatRoomID)) return

      let limit = this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE
      /***
       * if the removed message was the first unread messages(currentChatRoomReadUntil)
       * we can load message of that hash(messageHash) but not scroll
       * because it doesn't exist in this.ephemeral.messages
       * So in this case, we will load messages until the first unread mention
       * and scroll to that message
       */
      const instance = {}
      const messages = this.messageState.contract.messages || []
      const messageHashToScroll = this.ephemeral.initialScroll.hash
      const shouldLoadMoreEvents = messageHashToScroll && messages.findIndex(msg => msg.hash === messageHashToScroll) < 0

      // Set to 'have events been loaded dynamically'. Used to determine the
      // logic to use to fetch messages in a way that doesn't break message
      // order.
      const hasPreviousEvents = this.messageState.fetched && this.latestEvents.length

      if (shouldLoadMoreEvents) {
        if (this.ephemeral.loadingUp) return
        this.ephemeral.loadingUp = instance

        if (this.chatroomHasSwitchedFrom(chatRoomID)) return
        let events
        if (this.needsFromScratch) {
          // TODO: Implement snapshots or `keyOps` logic to make this
          // more efficient
          const { head: { height } } = await sbp('chelonia/out/deserializedHEAD', messageHashToScroll, { contractID: chatRoomID })
          if (this.chatroomHasSwitchedFrom(chatRoomID)) return
          events = await sbp('chelonia/out/eventsAfter', chatRoomID, { sinceHeight: 0, limit: height + limit / 2, stream: false })
        } else {
          events = await sbp('chelonia/out/eventsBetween', chatRoomID, { startHash: messageHashToScroll, offset: limit / 2, limit, stream: false })
        }
        if (this.chatroomHasSwitchedFrom(chatRoomID)) return
        try {
          await this.processEvents(events, direction, true)
        } finally {
          if (this.ephemeral.loadingUp === instance) {
            this.ephemeral.loadingUp = false
          }
        }
      } else if (direction === 'down' || !hasPreviousEvents) {
        if (this.ephemeral.loadingDown || (hasPreviousEvents && this.ephemeral.currentHighestHeight >= this.latestHeight)) return
        if (direction === 'down') {
          this.ephemeral.loadingDown = instance
        } else {
          this.ephemeral.loadingUp = instance
        }
        let sinceHeight
        if (this.needsFromScratch) {
          limit = undefined
          sinceHeight = 0
        } else if (this.ephemeral.currentHighestHeight == null || !hasPreviousEvents) {
          const { height: latestHeight } = await sbp('chelonia/out/latestHEADInfo', chatRoomID)
          sinceHeight = Math.max(latestHeight - limit + 1, 0)
        } else {
          sinceHeight = this.ephemeral.currentHighestHeight + 1
        }

        await sbp('chelonia/out/eventsAfter', chatRoomID, { sinceHeight, limit, stream: false }).then((events) => {
          if (this.chatroomHasSwitchedFrom(chatRoomID)) return
          return this.processEvents(events, direction).then(() => {
            // Special case: if loading events for a chatroom we're not part
            // of, scroll to bottom
            if (limit !== undefined || sinceHeight !== 0) return
            this.ephemeral.postSetMessageState = () => {
              if (this.chatroomHasSwitchedFrom(chatRoomID)) return
              if (!this.isJoinedChatRoom(chatRoomID)) {
                this.jumpToLatest('instant')
              }
            }
          })
        }).finally(() => {
          if (this.ephemeral.loadingDown === instance) {
            this.ephemeral.loadingDown = false
          } else if (this.ephemeral.loadingUp === instance) {
            this.ephemeral.loadingUp = false
          }
        })
      } else if (direction !== 'down') {
        const beforeHeight = this.ephemeral.currentLowestHeight
        if (this.ephemeral.loadingUp || beforeHeight === 0) return
        this.ephemeral.loadingUp = instance

        await sbp('chelonia/out/eventsBefore', chatRoomID, { beforeHeight: Math.max(0, beforeHeight - 1), limit, stream: false }).then((events) => {
          if (this.chatroomHasSwitchedFrom(chatRoomID)) return
          return this.processEvents(events, direction)
        }).finally(() => {
          if (this.ephemeral.loadingUp === instance) {
            this.ephemeral.loadingUp = false
          }
        })
      }

      if (!this.ephemeral.messagesInitiated) {
        this.ephemeral.messagesInitiated = true
        this.setStartNewMessageIndex()
      }

      return true
    },
    async processEvents (events, direction: 'up' | 'down' = 'down', replaceIfGap: boolean = false) {
      if (!events.length) return
      await enqueue.call(this, async () => {
        const firstEvent = this.latestEvents[0]
        const existingLength = this.latestEvents.length
        const lastEvent = this.latestEvents[existingLength - 1]

        const deserializedEvents = events.map((event) => {
          return SPMessage.deserialize(event)
        })

        let currentLatestEventIdx = 0

        if (existingLength) {
          const heightOfFirstEvent = deserializedEvents[0].height()
          const heightOfFirstExistingEvent = firstEvent.height()
          const heightOfLastExistingEvent = lastEvent.height()
          if (heightOfFirstEvent < heightOfFirstExistingEvent) {
            if (heightOfFirstEvent + deserializedEvents.length >= heightOfFirstExistingEvent) {
              if (heightOfFirstEvent + deserializedEvents.length <= heightOfLastExistingEvent) {
                this.latestEvents.unshift(...deserializedEvents.slice(0, heightOfFirstExistingEvent - heightOfFirstEvent))
              } else {
                this.latestEvents = deserializedEvents
              }
            } else if (replaceIfGap) {
              this.latestEvents = deserializedEvents
            } else {
              return
            }
          } else if (heightOfFirstEvent + deserializedEvents.length > heightOfLastExistingEvent) {
            if (heightOfFirstEvent <= (heightOfLastExistingEvent + 1)) {
              if (deserializedEvents.length > (heightOfLastExistingEvent - heightOfFirstEvent + 1)) {
                this.latestEvents.push(...deserializedEvents.slice(heightOfLastExistingEvent - heightOfFirstEvent + 1))
                currentLatestEventIdx = existingLength
              } else {
                return
              }
            } else if (replaceIfGap) {
              this.latestEvents = deserializedEvents
            } else {
              return
            }
          } else {
            return
          }
        } else {
          this.latestEvents = deserializedEvents
        }

        const entryHeight = this.latestEvents[currentLatestEventIdx].height()
        const chatroomID = this.ephemeral.renderingChatRoomId
        // If we haven't fetched messages dynamically or if we found a
        // currentLatestEventIdx, re-use the existing contract state. This
        // avoids fetching or processing messages unnecessarily. Otherwise, we
        // generate a fetch state with no messages.
        let state = currentLatestEventIdx || !this.messageState.fetched ? this.messageState.contract : await this.generateNewChatRoomState(true, entryHeight)
        if (this.chatroomHasSwitchedFrom(chatroomID)) return

        for (const event of this.latestEvents.slice(currentLatestEventIdx)) {
          state = await sbp('chelonia/in/processMessage', event.serialize(), state)
          // This for block is potentially time-consuming, so if the chatroom has switched, avoid unnecessary processing.
          if (this.chatroomHasSwitchedFrom(chatroomID)) return
        }

        if (this.messageState.fetched) {
          this.ephemeral.currentLowestHeight = this.latestEvents[0].height()
        }
        this.ephemeral.currentHighestHeight = this.latestEvents[this.latestEvents.length - 1].height()

        const previousLength = this.messageState.contract.messages.length
        const previousFirstHeight = this.messageState.contract.messages[0]?.height
        Vue.set(this.messageState, 'contract', state)

        if (
          // If there are no messages
          !state.messages.length ||
          // Or,
          (
            // If we have fetched messages from the server
            this.messageState.fetched &&
            // and the message count remained the same
            previousLength === state.messages.length &&
            // and no new messages were loaded
            previousFirstHeight === state.messages[0].height
          )
        ) {
          // Then, fetch more messages from the server
          // No `await` to prevent a deadlock
          this.loadMoreMessages(chatroomID, direction).catch(e => {
            console.error('[ChatMain.vue/processEvents] Error on `loadMoreMessages`', e)
          })
        }
      })
    },
    isMessageVisible (hash) {
      if (!this.$refs[hash]) return
      const conversationBCR = this.$refs.conversation.$el.getBoundingClientRect()
      const messageBCR = this.$refs[hash].$el.getBoundingClientRect()

      return messageBCR.top < (conversationBCR.bottom - 10) && messageBCR.bottom > (conversationBCR.top + 10)
    },
    proximityDate,
    chatroomHasSwitchedFrom (chatroomID) {
      // Some async operations (eg. this.rerenderEvents) are time-consuming, and user could switch away from the chatroom until the operation is not completed.
      // This method checks if that has happened.
      return chatroomID !== this.ephemeral.renderingChatRoomId
    },
    messageType (message) {
      return {
        [MESSAGE_TYPES.NOTIFICATION]: 'message-notification',
        [MESSAGE_TYPES.INTERACTIVE]: 'message-interactive',
        [MESSAGE_TYPES.TEXT]: 'message',
        [MESSAGE_TYPES.POLL]: 'message-poll'
      }[message.type]
    },
    isMsgSender (from) {
      return this.currentUserAttr.id === from
    },
    who (message) {
      const user = this.isMsgSender(message.from) ? this.currentUserAttr : this.summary.participants[message.from]
      return user?.displayName || user?.username || sbp('namespace/lookupReverseCached', message.from) || message.from
    },
    variant (message) {
      if (message.hasFailed) {
        return MESSAGE_VARIANTS.FAILED
      } else if (message.pending) {
        return MESSAGE_VARIANTS.PENDING
      } else {
        return this.isMsgSender(message.from) ? MESSAGE_VARIANTS.SENT : MESSAGE_VARIANTS.RECEIVED
      }
    },
    replyingMessageText (message) {
      return message.replyingMessage?.text
        ? message.replyingMessage.text.slice(0, CHATROOM_REPLYING_MESSAGE_LIMITS_IN_CHARS)
        : ''
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
    isSameSender (msg, prevMsg) {
      if (!prevMsg) { return false }
      if (msg.type !== MESSAGE_TYPES.TEXT) { return false }
      if (msg.type !== prevMsg.type) { return false }
      const timeBetween = new Date(msg.datetime).getTime() -
        new Date(prevMsg.datetime).getTime()
      if (timeBetween > MINS_MILLIS * 10) { return false }
      return msg.from === prevMsg.from
    },
    stopReplying () {
      this.ephemeral.replyingMessage = null
      this.ephemeral.replyingTo = null
    },
    handleSendMessage (text, attachments, replyingMessage) {
      const hasAttachments = attachments?.length > 0
      const contractID = this.ephemeral.renderingChatRoomId

      const data = { type: MESSAGE_TYPES.TEXT, text }
      if (replyingMessage) {
        data.replyingMessage = replyingMessage
      }

      const sendMessage = (beforePrePublish) => {
        let pendingMessageHash = null
        const beforeRequest = (message, oldMessage) => {
          if (this.chatroomHasSwitchedFrom(contractID)) return
          enqueue.call(this, async () => {
            beforePrePublish?.()

            // IMPORTANT: This is executed *BEFORE* the message is received over
            // the network
            const msg = this.messageState.contract.messages.find(m => (m.hash === oldMessage.hash()))
            if (!msg) {
              const newContractState = await sbp('chelonia/in/processMessage', message, this.messageState.contract)
              this.ephemeral.postSetMessageState = () => {
                if (this.chatroomHasSwitchedFrom(contractID)) {
                  return
                }
                if (!this.ephemeral.messages.length || this.ephemeral.messages[this.ephemeral.messages.length - 1].height < message.height) {
                  return
                }
                this.jumpToLatest()
              }
              Vue.set(this.messageState, 'contract', newContractState)
              this.stopReplying()
            } else {
              msg.hash = message.hash()
              msg.height = message.height()
              pendingMessageHash = message.hash()

              // NOTE: whenever the message.hash() is changed, we should update the related state too
              //       (chatroomReadUntilMessageHash, chatroomScrollPosotion)
              this.onChatScroll()
            }
          })
        }
        // Call 'gi.actions/chatroom/addMessage' action with necessary data to send the message
        sbp('gi.actions/chatroom/addMessage', {
          contractID,
          data,
          hooks: {
            // Define a 'beforeRequest' hook for additional processing before the
            // request is made.
            // IMPORTANT: This will call 'chelonia/in/processMessage' *BEFORE* the
            // message has been received. This is intentional to mark yet-unsent
            // messages as pending in the UI
            beforeRequest
          }
        }).catch((e) => {
          if (e.cause?.name === 'ChelErrorFetchServerTimeFailed') {
            alert(L("Can't send message when offline, please connect to the Internet"))
          } else {
            const msgIndex = findMessageIdx(pendingMessageHash, this.messageState.contract.messages)
            if (msgIndex > 0) {
              Vue.set(this.messageState.contract.messages[msgIndex], 'hasFailed', true)
            }
          }
        })
      }
      const uploadAttachments = async (messageHash) => {
        const cancellableUpload = () => {
          return Promise.race([
            new Promise((resolve) => {
              sbp('okTurtles.events/once', CHATROOM_CANCEL_UPLOAD_ATTACHMENTS, (mHash) => {
                if (mHash === messageHash) {
                  this.ephemeral.uploadingAttachments = Object.fromEntries(
                    Object.entries(this.ephemeral.uploadingAttachments).filter(([key]) => key !== messageHash)
                  )
                  console.log('!@# this.ephemeral.uploadingAttachments - after: ', this.ephemeral.uploadingAttachments)
                  resolve()
                }
              })
            }),
            sbp('gi.actions/identity/uploadFiles', {
              attachments,
              billableContractID: contractID,
              messageHash
            })
          ])
        }

        try {
          attachments = await this.checkAndCompressImages(attachments)
          console.log('!@# data.attachments - before: ', data.attachments)
          data.attachments = await cancellableUpload()
          console.log('!@# data.attachments - after: ', data.attachments)

          return true
        } catch (e) {
          console.log('[ChatMain.vue]: something went wrong while uploading attachments ', e)
          throw e
        } finally {
          attachments.forEach(attachment => {
            if (attachment.url) {
              URL.revokeObjectURL(attachment.url)
            }
          })
        }
      }

      if (!hasAttachments) {
        sendMessage()
      } else {
        let temporaryMessage = null
        sbp('gi.actions/chatroom/addMessage', {
          contractID,
          data,
          hooks: {
            preSendCheck: async (message, state) => {
              // NOTE: this preSendCheck does nothing except appending a pending message
              //       temporarily until the uploading attachments is finished
              //       it always returns false, so it doesn't affect the contract state
              this.stopReplying()

              if (this.chatroomHasSwitchedFrom(contractID)) return
              await enqueue.call(this, async () => {
                this.ephemeral.postSetMessageState = () => {
                  if (this.chatroomHasSwitchedFrom(contractID)) return
                  if (!this.ephemeral.messages.length || this.ephemeral.messages[this.ephemeral.messages.length - 1].height < message.height) return
                  this.jumpToLatest()
                }

                Vue.set(this.messageState, 'contract', await sbp('chelonia/in/processMessage', message, this.messageState.contract))
                temporaryMessage = this.messageState.contract.messages.find((m) => m.hash === message.hash())
                if (temporaryMessage) {
                  Vue.set(this.ephemeral.uploadingAttachments, temporaryMessage.hash, true)
                }
              })

              return false
            }
          }
        }).then(async () => {
          await uploadAttachments(temporaryMessage.hash)
          const removeTemporaryMessage = () => {
            // NOTE: remove temporary message which is created before uploading attachments
            if (temporaryMessage) {
              const messageHash = temporaryMessage.hash
              if (this.ephemeral.uploadingAttachments[messageHash]) {
                Vue.delete(this.ephemeral.uploadingAttachments, messageHash)
              }
              const messages = this.messageState.contract.messages
              const msgIndex = findMessageIdx(messageHash, messages)
              if (msgIndex < 0) return
              messages.splice(msgIndex, 1)
            }
          }
          console.log('!@# is it here - aaa')
          sendMessage(removeTemporaryMessage)
        }).catch((e) => {
          if (e.cause?.name === 'ChelErrorFetchServerTimeFailed') {
            alert(L("Can't send message when offline, please connect to the Internet"))
          } else {
            if (temporaryMessage) {
              Vue.set(temporaryMessage, 'hasFailed', true)
            }
            console.error('[ChatMain.vue] Error sending message', e)
          }
        })
      }
    },
    checkAndCompressImages (attachments) {
      return Promise.all(
        attachments.map(async attachment => {
          if (attachment.needsImageCompression) {
            const compressedImageBlob = await compressImage(attachment.url)
            const fileNameWithoutExtension = attachment.name.split('.').slice(0, -1).join('.')
            const extension = compressedImageBlob.type.split('/')[1]

            return {
              ...attachment,
              mimeType: compressedImageBlob.type,
              name: `${fileNameWithoutExtension}.${extension}`,
              size: compressedImageBlob.size,
              url: URL.createObjectURL(compressedImageBlob),
              compressedBlob: compressedImageBlob
            }
          } else { return attachment }
        })
      )
    },
    async scrollToMessage (messageHash, effect = true) {
      if (!messageHash || !this.ephemeral.messages.length) {
        return
      }
      const contractID = this.ephemeral.renderingChatRoomId

      const scrollAndHighlight = () => {
        const index = findMessageIdx(messageHash, this.ephemeral.messages)

        if (effect) {
          this.$nextTick(() => {
            if (this.chatroomHasSwitchedFrom(contractID)) return
            this.$refs.conversation.scrollToItem(Math.max(index - 1, 0))
            this.ephemeral.focusedEffect = messageHash
            setTimeout(() => {
              if (this.ephemeral.focusedEffect !== messageHash) return
              this.ephemeral.focusedEffect = null
            }, 1500)
          })
        } else {
          this.$refs.conversation.scrollToItem(index)
        }
      }

      const msgIndex = findMessageIdx(messageHash, this.ephemeral.messages)
      if (msgIndex >= 0) {
        scrollAndHighlight(msgIndex)
      } else {
        const limit = this.isJoinedChatRoom(contractID) ? this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE : 0
        let events
        if (this.needsFromScratch) {
          // TODO: Implement snapshots or `keyOps` logic to make this
          // more efficient
          const { height } = await sbp('chelonia/out/deserializedHEAD', messageHash, { contractID })
          if (this.chatroomHasSwitchedFrom(contractID)) return
          events = await sbp('chelonia/out/eventsAfter', contractID, { sinceHeight: 0, limit: height + limit / 2, stream: false })
        } else {
          events = await sbp('chelonia/out/eventsBetween', contractID, { startHash: messageHash, offset: limit / 2, limit, stream: false })
        }
        if (this.chatroomHasSwitchedFrom(contractID)) return
        if (events && events.length) {
          this.ephemeral.postSetMessageState = () => {
            if (this.chatroomHasSwitchedFrom(contractID)) return

            const msgIndex = findMessageIdx(messageHash, this.ephemeral.messages)
            if (msgIndex >= 0) {
              this.$nextTick(() => scrollAndHighlight(msgIndex))
            } else {
            // this is when the target message is deleted after reply message
            // should let user know the target message is deleted
              console.debug(`Message ${messageHash} is removed from ${contractID}`)
            }
          }
          this.ephemeral.postSetMessageState.noRerender = true
          await this.processEvents(events, 'up', true)
        }
      }
    },
    performScrollAction (action) {
      clearTimeout(this.ephemeral.scrollActionId)
      this.ephemeral.scrollActionId = setTimeout(action, 0)
    },
    updateScroll (scrollTargetMessage = null, effect = false, delay = 100) {
      const contractID = this.ephemeral.renderingChatRoomId
      if (contractID) {
        return new Promise((resolve) => {
          // force conversation viewport to be at the bottom (most recent messages)
          setTimeout(async () => {
            if (scrollTargetMessage) {
              if (this.chatroomHasSwitchedFrom(contractID)) return
              await this.scrollToMessage(scrollTargetMessage, effect)
            } else {
              this.jumpToLatest()
            }

            resolve()
          }, delay)
        })
      }
    },
    jumpToLatest (behavior = 'smooth') {
      if (!this.$refs.conversation) return
      if (this.latestHeight && !(this.ephemeral.currentHighestHeight >= this.latestHeight)) {
        const hash = this.$store.state.contracts[this.ephemeral.renderingChatRoomId]?.HEAD
        if (hash) {
          this.scrollToMessage(hash, false)
          return
        }
      }
      this.$refs.conversation.$el.scroll({
        left: 0,
        top: this.$refs.conversation.$el.scrollHeight + 5000,
        // NOTE-1: Force 'instant' behaviour in reduced-motion mode regardless of the passed param.
        // NOTE-2: Browsers suspend DOM animation when the tab is inactive. Passing 'smooth' option for an inactive browser window
        //         leads to the scroll() action being ignored. So we need to explicitly pass 'instant' option in this case.
        behavior: this.isReducedMotionMode || document.hidden
          ? 'instant'
          : behavior
      })
    },
    retryMessage (msg) {
      const message = cloneDeep(msg)
      const index = this.ephemeral.messages.indexOf(msg)
      if (index >= 0) this.ephemeral.messages.splice(index, 1)
      this.handleSendMessage(message.text, message.attachments, message.replyingMessage)
    },
    replyToMessage (message) {
      const { text, hash, type, attachments } = message
      const isTypeInteractive = type === MESSAGE_TYPES.INTERACTIVE

      if (isTypeInteractive) {
        const proposal = message.proposal

        this.ephemeral.replyingMessage = {
          hash, text: interactiveMessage(proposal, { from: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${proposal.creatorID}` })
        }
      } else if (!text && attachments?.length) {
        this.ephemeral.replyingMessage = { hash, text: attachments[0].name }
      } else {
        const sanitizeAndTruncate = text => {
          return swapMentionIDForDisplayname(text)
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim()
            .slice(0, CHATROOM_REPLYING_MESSAGE_LIMITS_IN_CHARS)
        }

        this.ephemeral.replyingMessage = { hash, text: sanitizeAndTruncate(text) }
      }

      this.ephemeral.replyingTo = isTypeInteractive ? L('Proposal notification') : this.who(message)
    },
    editMessage (message, newMessage) {
      this.triggerEditMessage(message.hash, false)
      message.text = newMessage
      message.pending = true
      const contractID = this.ephemeral.renderingChatRoomId
      sbp('gi.actions/chatroom/editMessage', {
        contractID,
        data: {
          hash: message.hash,
          createdHeight: message.height,
          text: newMessage
        }
      }).catch((e) => {
        console.error(`Error while editing message(${message.hash}) in chatroom(${contractID})`, e)
      })
    },
    pinToChannel (message) {
      const contractID = this.ephemeral.renderingChatRoomId
      sbp('gi.actions/chatroom/pinMessage', {
        contractID,
        data: { message }
      }).catch((e) => {
        console.error(`Error while pinning message(${message.hash}) in chatroom(${contractID})`, e)
      })
    },
    async unpinFromChannel (hash) {
      const contractID = this.ephemeral.renderingChatRoomId

      const promptConfig = {
        heading: L('Remove pinned message'),
        question: L('Are you sure you want to remove this pinned message?'),
        primaryButton: L('Yes'),
        secondaryButton: L('Cancel')
      }

      const primaryButtonSelected = await sbp('gi.ui/prompt', promptConfig)

      if (primaryButtonSelected) {
        sbp('gi.actions/chatroom/unpinMessage', {
          contractID,
          data: { hash }
        }).catch((e) => {
          console.error(`Error while un-pinning message(${hash}) in chatroom(${contractID})`, e)
        })
      }
    },
    async deleteMessage (message) {
      const msgHash = message.hash
      const contractID = this.ephemeral.renderingChatRoomId
      const manifestCids = (message.attachments || []).map(attachment => attachment.downloadData.manifestCid)

      const lastMsg = this.ephemeral.messages[this.ephemeral.messages.length - 1]
      const secondLastMsg = this.ephemeral.messages[this.ephemeral.messages.length - 2]
      const isDeletingLastMsg = msgHash === lastMsg?.hash

      const question = message.attachments?.length
        ? L('Are you sure you want to delete this message and its file attachments?')
        : L('Are you sure you want to delete this message?')

      const promptConfig = {
        heading: L('Delete message'),
        question,
        primaryButton: L('Yes'),
        secondaryButton: L('Cancel')
      }

      try {
        const primaryButtonSelected = await sbp('gi.ui/prompt', promptConfig)
        if (primaryButtonSelected) {
          await sbp('gi.actions/chatroom/deleteMessage', {
            contractID,
            data: { hash: msgHash, manifestCids, messageSender: message.from }
          })

          // If the deleted message is the most recent message and 'currentChatRoomReadUntil' is pointing to the deleted one,
          // it needs to be updated to the second most recent one.
          if (isDeletingLastMsg &&
            this.currentChatRoomReadUntil?.messageHash === msgHash &&
            secondLastMsg) {
            this.updateReadUntilMessageHash({
              messageHash: secondLastMsg.hash,
              createdHeight: secondLastMsg.height,
              forceUpdate: true
            })
          }
        }
      } catch (e) {
        console.error(`Error while deleting message(${msgHash}) for chatroom(${contractID})`, e)

        sbp('gi.ui/prompt', {
          heading: L('Error while deleting a message'),
          question: L('Error details: {reportError}', LError(e)),
          primaryButton: L('Close')
        })
      }
    },
    async deleteAttachment (message, manifestCid) {
      const contractID = this.ephemeral.renderingChatRoomId
      const { from, hash } = message
      const shouldDeleteMessageInstead = !message.text && message.attachments?.length === 1

      if (shouldDeleteMessageInstead) {
        this.deleteMessage(message)
        return
      }

      const promptConfig = {
        heading: L('Delete file'),
        question: L('Are you sure you want to delete this file permanently?'),
        primaryButton: L('Yes'),
        secondaryButton: L('Cancel')
      }

      const primaryButtonSelected = await sbp('gi.ui/prompt', promptConfig)
      const sendDeleteAttachmentFeedback = (action) => {
        // Delete attachment action can lead to 'success', 'error' or can be cancelled by user.
        sbp('okTurtles.events/emit', DELETE_ATTACHMENT_FEEDBACK, { action, manifestCid })
      }

      if (primaryButtonSelected) {
        const data = { hash, manifestCid, messageSender: from }
        sbp('gi.actions/chatroom/deleteAttachment', { contractID, data })
          .then(() => sendDeleteAttachmentFeedback('complete'))
          .catch((e) => {
            console.error(`Error while deleting attachment(${manifestCid}) of message(${hash}) for chatroom(${contractID})`, e)
            sendDeleteAttachmentFeedback('error')
          })
      } else {
        sendDeleteAttachmentFeedback('cancel')
      }
    },
    changeDay (msg, prevMsg) {
      if (prevMsg && msg) {
        const prev = new Date(prevMsg.datetime)
        const current = new Date(msg.datetime)
        return prev.getDay() !== current.getDay()
      }

      return false
    },
    isNew (msgHash) {
      return this.ephemeral.startedUnreadMessageHash === msgHash
    },
    addEmoticon (message, emoticon) {
      const contractID = this.ephemeral.renderingChatRoomId
      sbp('gi.actions/chatroom/makeEmotion', {
        contractID,
        data: { hash: message.hash, emoticon }
      }).catch((e) => {
        console.error(`Error while adding emotion for ${contractID}`, e)
      })
    },
    async generateNewChatRoomState (shouldClearMessages = false, height) {
      const state = await sbp('chelonia/contract/state', this.ephemeral.renderingChatRoomId, height) || {}
      const messages = shouldClearMessages ? [] : (state.messages || [])
      return {
        settings: state.settings || {},
        attributes: state.attributes || {},
        members: state.members || {},
        _vm: state._vm,
        messages,
        pinnedMessages: [], // NOTE: We don't use this pinnedMessages, but initialize so that the process functions won't break
        renderingContext: true // NOTE: DO NOT RENAME THIS OR CHATROOM WOULD BREAK
      }
    },
    async initializeState (forceClearMessages = false) {
      // NOTE: this state is rendered using the chatroom contract functions
      //       so should be CAREFUL of updating the fields
      const chatRoomID = this.ephemeral.renderingChatRoomId
      const messageState = await this.generateNewChatRoomState(forceClearMessages)

      // If user has since switched to another chatroom, no need to update 'this.messageState'
      if (this.chatroomHasSwitchedFrom(chatRoomID)) return

      this.latestEvents = []
      this.ephemeral.currentLowestHeight = undefined
      if (this.latestHeight && messageState.messages.length) {
        this.ephemeral.currentHighestHeight = this.latestHeight
      } else {
        this.ephemeral.currentHighestHeight = undefined
      }
      if (!this.isJoinedChatRoom(chatRoomID)) {
        const { height: latestHeight } = await sbp('chelonia/out/latestHEADInfo', chatRoomID)
        if (this.chatroomHasSwitchedFrom(chatRoomID)) return
        this.ephemeral.latestHeight = latestHeight
      } else {
        this.ephemeral.latestHeight = undefined
      }
      this.ephemeral.unprocessedEvents = []
      this.ephemeral.isEditing = {}
      this.ephemeral.uploadingAttachments = {}
      this.ephemeral.focusedEffect = null
      const readUntilPosition = this.currentChatRoomReadUntil?.messageHash
      // NOTE: mhash is a query for scrolling to a particular message
      //       when chat-room is done with the initial render.
      //       (refer to 'copyMessageLink' method in MessageBase.vue)
      const { mhash } = this.$route.query
      this.ephemeral.initialScroll.hash = mhash || this.currentChatRoomScrollPosition || readUntilPosition
      this.ephemeral.messagesInitiated = !!messageState.messages.length && (!this.ephemeral.initialScroll.hash || !!messageState.messages.find(m => m.hash === this.ephemeral.initialScroll.hash))
      Vue.set(this.messageState, 'contract', messageState)
      // At this point, we've not fetched any messages dynamically, so `fetched`
      // is set to false.
      Vue.set(this.messageState, 'fetched', false)
      if (!this.ephemeral.messagesInitiated) await this.loadMoreMessages(chatRoomID)
    },
    // Similar to calling initializeState(true), except that it's synchronous
    // and doesn't rely on `renderingChatRoomId`, which isn't set yet.
    skeletonState (chatRoomId) {
      const state = sbp('state/vuex/state')[chatRoomId] || {}
      const messageState = {
        settings: state.settings || {},
        attributes: state.attributes || {},
        members: state.members || {},
        _vm: state._vm,
        messages: [],
        pinnedMessages: [],
        renderingContext: true
      }
      this.ephemeral.initialScroll.hash = null
      this.ephemeral.renderingChatRoomId = null
      this.latestEvents = []
      Vue.set(this.messageState, 'contract', messageState)
    },
    rerenderEvents (topMessage) {
      if (!this.ephemeral.messagesInitiated) return
      if (this.ephemeral.initialScroll.hash) {
        this.$nextTick(() => {
          this.scrollToInitialPosition()
        })
      } else {
        const conversation = this.$refs.conversation?.$el
        if (!conversation) {
          return
        }
        if (!topMessage) {
          return
        }

        const contractID = this.ephemeral.renderingChatRoomId
        this.$nextTick(() => {
          if (this.chatroomHasSwitchedFrom(contractID) || conversation.scrollHeight <= conversation.clientHeight) {
            return
          }
          const visibleMessageIterator = this.visibleMessageIterator()
          const { value: newTopMessage } = visibleMessageIterator.next()
          if (!newTopMessage || topMessage.hash === newTopMessage.hash) {
            return
          }
          this.scrollToMessage(topMessage.hash, false)
        })
      }
    },
    scrollToInitialPosition () {
      const hashTo = this.ephemeral.initialScroll.hash
      if (hashTo) {
        const scrollingToSpecificMessage = this.$route.query?.mhash === hashTo
        this.$nextTick(() => {
          this.updateScroll(
            hashTo,
            // NOTE: we do want the 'c-focused' animation if there is a scroll-to-message query.
            scrollingToSpecificMessage,
            0 // don't need the delay here
          )
          // NOTE: delete mhash in the query after scroll and highlight the message with mhash
          if (scrollingToSpecificMessage) {
            const newQuery = { ...this.$route.query }
            delete newQuery.mhash
            this.$router.replace({ query: newQuery })
          }

          // Once scrolling is complete, reset the hash to null.
          // This ensures that 'auto-scroll to initial position' happens only once.
          // Only do so if there is scroll area, so that auto-loading more
          // messages to fill up the chat window will preserve the initial
          // position
          let tryCount = 0
          const resetHash = () => {
            const $el = this.$refs.conversation?.$el
            if (!$el) {
              if (tryCount++ < 3) this.$nextTick(resetHash)
              return
            }

            if ($el.clientHeight < $el.scrollHeight) {
              this.ephemeral.initialScroll.hash = null
            }
          }
          resetHash()
        })
      }
    },
    setStartNewMessageIndex () {
      this.ephemeral.startedUnreadMessageHash = null
      if (this.currentChatRoomReadUntil) {
        const index = this.ephemeral.messages.findIndex(msg => msg.height > this.currentChatRoomReadUntil.createdHeight)

        if (index >= 0) {
          this.ephemeral.startedUnreadMessageHash = this.ephemeral.messages[index].hash
        }
      }
    },
    updateReadUntilMessageHash ({
      messageHash,
      createdHeight,
      // 'forceUpdate' flag here is for the rare case where the 'readUntil' value needs to be set to the msg with lower 'createdHeight'.
      // eg. when the latest message is deleted. (reference: https://github.com/okTurtles/group-income/issues/2729)
      forceUpdate = false
    }) {
      if (this.ephemeral.messageHashToMarkUnread) {
        // 'Mark unread' feature allows user to set 'currentChatRoomReadUntil' to the message they want.
        // So if user has used this functionality at least once in the current chatroom,
        // the chatroom should stop auto-updating the 'readUntil' data in various situations (eg. while scrolling),
        // So that the message that has been marked unread is kept until user leaves and re-enter the chatroom in the future.
        return
      }

      const chatRoomID = this.ephemeral.renderingChatRoomId
      if (chatRoomID && this.isJoinedChatRoom(chatRoomID)) {
        // NOTE: skip adding useless invocations in KV_QUEUE queue.
        if (!forceUpdate && this.currentChatRoomReadUntil?.createdHeight >= createdHeight) { return }

        sbp('gi.actions/identity/kv/setChatRoomReadUntil', {
          contractID: chatRoomID, messageHash, createdHeight, forceUpdate
        }).catch(e => {
          console.error('[ChatMain.vue] Error setting read until', e)
        })
      }
    },
    async markAsUnread ({ messageHash, createdHeight }) {
      const chatRoomID = this.ephemeral.renderingChatRoomId
      if (!chatRoomID || !this.isJoinedChatRoom(chatRoomID)) { return }

      const index = this.ephemeral.messages.findIndex(msg => msg.hash === messageHash)
      const isFirstMessage = index === 0
      const targetMsg = isFirstMessage ? this.ephemeral.messages[index] : this.ephemeral.messages[index - 1]

      const getUpdatedUnreadMessages = () => {
        // This method filters the messages to store in 'unreadMessages' property (eg. messages that mentions me or contains '@all'),
        // which are reflected as the unread-count badge in the UI.
        const isInDM = this.isGroupDirectMessage(this.ephemeral.renderingChatRoomId)
        const mentions = makeMentionFromUserID(this.ourIdentityContractId)
        const messageMentionsMe = msg => {
          return msg.type === MESSAGE_TYPES.TEXT &&
            msg.text &&
            (msg.text.includes(mentions.me) || msg.text.includes(mentions.all))
        }

        return this.ephemeral.messages.slice(index)
          .filter(msg => {
            if (this.isMsgSender(msg.from)) { return false }

            return isInDM ||
              [MESSAGE_TYPES.INTERACTIVE, MESSAGE_TYPES.POLL].includes(msg.type) ||
              messageMentionsMe(msg)
          }).map(msg => ({ messageHash: msg.hash, createdHeight: msg.height }))
      }

      try {
        this.ephemeral.messageHashToMarkUnread = targetMsg.hash
        await sbp('gi.actions/identity/kv/markAsUnread', {
          contractID: chatRoomID,
          messageHash: targetMsg.hash,
          // NOTE: 'createdHeight' field stores the 'msg.height' value of the previous message of the target message and
          //       then later used in the UI to determine on which message to display 'is-new' UI Element [1].
          //       But in the case where the target is the first message of the chatroom, meaning there is no previous message,
          //       we need to manually specify the decremented 'createdHeight' value here, so that [1] above does not break in the UI.
          createdHeight: isFirstMessage ? createdHeight - 1 : targetMsg.height,
          // When marked as unread, all the messages after the target message are stored in 'unreadMessages' property.
          unreadMessages: getUpdatedUnreadMessages()
        })
      } catch (e) {
        console.error('[ChatMain.vue] Error while marking message unread', e)
        this.ephemeral.messageHashToMarkUnread = null
      }
    },
    markUnreadPostActions () {
      this.ephemeral.startedUnreadMessageHash = null
      if (this.currentChatRoomReadUntil) {
        const foundIndex = this.ephemeral.messages.findIndex(msg => msg.height > this.currentChatRoomReadUntil.createdHeight)

        if (foundIndex >= 0) {
          this.ephemeral.startedUnreadMessageHash = this.ephemeral.messages[foundIndex].hash
        }
      }
    },
    listenChatRoomActions (contractID: string, message?: SPMessage) {
      if (this.chatroomHasSwitchedFrom(contractID)) return

      if (message) this.ephemeral.unprocessedEvents.push(message)

      if (!this.ephemeral.messagesInitiated) return

      this.ephemeral.unprocessedEvents.splice(0).forEach((message) => {
        // TODO: The next line will _not_ get information about any inner signatures,
        // which is used for determininng the sender of a message. Update with
        // another call to SPMessage to get signature information
        const value = message.decryptedValue()
        if (!value) throw new Error('Unable to decrypt message')

        const isMessageAddedOrDeleted = (message: SPMessage) => {
          const allowedActionType = [SPMessage.OP_ACTION_ENCRYPTED, SPMessage.OP_ACTION_UNENCRYPTED]
          const getAllowedMessageAction = (opType, opValue) => {
            if (opType === SPMessage.OP_ATOMIC) {
              const actions = opValue
                .map(([t, v]) => getAllowedMessageAction(t, v.valueOf().valueOf()))
                .filter(Boolean)
              // TODO: Now we return the first action of list
              //       because there is only one allowedAction in OP_ATOMIC message now.
              //       But later we need to consider several child actions for A OP_ATOMIC message
              return actions[0]
            } else if (allowedActionType.includes(opType)) {
              return opValue.action
            } else {
              return undefined
            }
          }

          const action = getAllowedMessageAction(message.opType(), value)
          let addedOrDeleted = 'NONE'

          if (/(addMessage|join|rename|changeDescription|leave)$/.test(action)) {
          // we add new pending message in 'handleSendMessage' function so we skip when I added a new message
            addedOrDeleted = 'ADDED'
          } else if (/(deleteMessage)$/.test(action)) {
            addedOrDeleted = 'DELETED'
          }

          // TODO: Use innerSigningContractID
          return { addedOrDeleted }
        }

        // NOTE: while syncing the chatroom contract, we should ignore all the events
        const { addedOrDeleted } = isMessageAddedOrDeleted(message)

        ;(async () => {
          // Messages are processed twice: before sending (outgoing direction,
          // pending status) and then again when received from the server
          // (incoming direction)
          if (message.direction() === 'incoming') {
            // For incoming messages that aren't pending, we skip them
            const msgIndex = findMessageIdx(message.hash(), this.ephemeral.messages)
            if (msgIndex !== -1 && !this.ephemeral.messages[msgIndex].pending) {
              // Message was already processed
              return
            }
          }

          if (addedOrDeleted === 'DELETED') {
            // NOTE: Message will be deleted in processMessage function
            //       but need to make animation to delete it, probably here
            const messageHash = value.data.hash
            const msgEl = this.$refs[messageHash]?.$el
            if (msgEl) {
              msgEl.classList.add('c-disappeared')

              // NOTE: waiting for the animation to be completed with the duration of 500ms
              //       .c-disappeared class is defined in MessageBase.vue
              await delay(500)
            }
          }

          const serializedMessage = message.serialize()
          await this.processEvents([serializedMessage], 'down', false)

          // When the current scroll position is nearly at the bottom and a new message is added, auto-scroll to the bottom.
          if (this.ephemeral.scrollableDistance < 50) {
            if (addedOrDeleted === 'ADDED' && this.messageState.contract.messages.length) {
              const isScrollable = this.$refs.conversation &&
                this.$refs.conversation.$el.scrollHeight > this.$refs.conversation.$el.clientHeight
              if (isScrollable) {
                // Scroll-query to the latest message.
                this.updateScroll()
              } else {
                // If there are any temporary messages that do not exist in the
                // contract, they should not be used for updateReadUntilMessageHash
                const msg = this.messageState.contract.messages.filter(m => !m.pending && !m.hasFailed).pop()
                if (msg) {
                  this.updateReadUntilMessageHash({
                    messageHash: msg.hash,
                    createdHeight: msg.height
                  })
                }
              }
            }
          }

          if (addedOrDeleted !== 'NONE' && this.ephemeral.messageHashToMarkUnread) {
            // If user has used 'Mark unread' but then messages are either added or deleted,
            // 'unreadMessages' data in the store should be updated accordingly.
            const action = addedOrDeleted === 'ADDED' ? 'addChatRoomUnreadMessage' : 'removeChatRoomUnreadMessage'
            sbp(`gi.actions/identity/kv/${action}`, {
              contractID: this.ephemeral.renderingChatRoomId,
              messageHash: value.data.hash,
              createdHeight: value.data.height
            })
          }
        })()
      })
    },
    resizeEventHandler () {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)

      if (this.ephemeral.scrollableDistance < 40) {
        // NOTE: 40px is the minimum height of a message
        //       even though user scrolled up, if he scrolled less than 40px (one message)
        //       should ignore the scroll position, and scroll to the bottom
        this.throttledJumpToLatest(this)
      }
    },
    throttledJumpToLatest: throttle(function (_this) {
      // NOTE: 40ms makes the container scroll the 25 times a second which feels like animated
      _this.jumpToLatest('instant')
    }, 40),
    async onScrollEvt (direction: 'up' | 'down' = 'down') {
      if (this.ephemeral.messagesInitiated === undefined) return
      if (direction === 'down' && this.ephemeral.currentHighestHeight >= this.latestHeight && this.$refs.conversation.$el.scrollHeight > this.$refs.conversation.$el.clientHeight) return

      // if (this.ephemeral.initialScroll.hash) {
      // clearTimeout(this.ephemeral.initialScroll.timeoutId)
      // }

      const targetChatroomID = this.ephemeral.renderingChatRoomId
      // NOTE: invocations in CHATROOM_EVENTS queue should run in synchronous
      try {
        const completed = await this.loadMoreMessages(targetChatroomID, direction)
        if (this.chatroomHasSwitchedFrom(targetChatroomID)) return

        if (completed !== undefined && !this.ephemeral.messagesInitiated) {
          // NOTE: 'this.ephemeral.messagesInitiated' can be set true only when loadMoreMessages are successfully proceeded
          this.ephemeral.messagesInitiated = true
        }
      } catch (e) {
        console.error('ChatMain onScrollEvt() error:', e)
      }
    },
    onScrollStart: function () {
      this.ephemeral.onScrollStart()
    },
    onScrollEnd: function () {
      this.ephemeral.onScrollEnd()
    },
    onChatScroll (ev) {
      // NOTE: We need this method wrapper to avoid ephemeral.onChatScroll being null
      this.ephemeral.onChatScroll?.(ev)
    },
    // Handlers for file-upload via drag & drop action
    dragStartHandler (e) {
      e.preventDefault()
      // handler function for 'dragstart', 'dragover' events.

      this.dndState.isActive = true
      // give user a correct feedback about what happens upon 'drop' action. (https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
      e.dataTransfer.dropEffect = 'copy'
    },
    dragEndHandler (e) {
      // handler function for 'dragleave', 'dragend', 'drop' events
      e.preventDefault()

      if (this.dndState.isActive) {
        this.dndState.isActive = false

        const items = e.dataTransfer.items

        if (items?.length) {
          // 'drag-end' event of the browsers detects files as well as folders, and we only want
          // files. The kind field and the getAsFile() methods are not helpful at telling them
          // apart, as both will work as a 'File'. The only quick and reliable way to detect files
          // is using webkitGetAsEntry.
          // (Reference: https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/webkitGetAsEntry)
          const detectedFiles = []

          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const entry = item.getAsEntry?.() || item.webkitGetAsEntry?.()

            if (entry) {
              entry.isFile && detectedFiles.push(item.getAsFile())
            } else {
              // NOTE: if an old browser that does not support webkitGetAsEntry (eg. Internet Explorers), this fallback might accept a directory.
              const file = item.getAsFile()

              if (file && file.type !== '') {
                detectedFiles.push(file)
              }
            }
          }

          detectedFiles.length &&
            this.$refs.sendArea.fileAttachmentHandler(detectedFiles)
        }
      }
    },
    processChatroomSwitch: debounce(async function () {
      if (!this.ephemeral.chatroomIdToSwitchTo) return

      const targetChatroomId = this.ephemeral.chatroomIdToSwitchTo
      this.ephemeral.chatroomIdToSwitchTo = null

      if (targetChatroomId === this.ephemeral.renderingChatRoomId) return
      this.ephemeral.renderingChatRoomId = targetChatroomId

      try {
        await this.initializeState()
        if (this.ephemeral.chatroomIdToSwitchTo) {
          // If the user has since switched to another chatroom while initializing this chatroom, stop here
          // and care about the switched chatroom.

          // NOTE: 'return this.processChatroomSwitch()' below would make it more clear that we don't proceed with anything else, but
          //       having return here creates an occasional error saying 'TypeError: Chaining cycle detected for promise'.
          this.processChatroomSwitch()
        }
      } catch (e) {
        console.error('ChatMain.vue processChatroomSwitch() error:', e)

        if (!this.chatroomHasSwitchedFrom(targetChatroomId)) {
          sbp('gi.ui/prompt', {
            heading: L('Failed to initialize chatroom'),
            question: L('Error details: {reportError}', LError(e)),
            primaryButton: L('Close')
          })
        }
        // In case of an error here, we want CI to fail.
        if (process.env.CI) {
          throw e
        }
      }
    }, process.env.CI ? 25 : 250)
  },
  provide () {
    return {
      chatMainConfig: this.config,
      chatMainUtils: {
        markAsUnread: this.markAsUnread
      }
    }
  },
  watch: {
    'summary' (to, from) {
      const toChatRoomId = to.chatRoomID
      const fromChatRoomId = from.chatRoomID

      const initAfterSynced = (toChatRoomId) => {
        // If the user has switched to another chatroom during syncing, no need to process the chatroom that has been swithed away.
        if (toChatRoomId !== this.summary.chatRoomID) return
        this.processChatroomSwitch()
      }

      if (toChatRoomId !== fromChatRoomId) {
        this.ephemeral.onChatScroll?.flush()
        this.ephemeral.onScrollStart.clear?.()
        this.ephemeral.onScrollEnd.clear?.()
        // Skeleton state is to render what basic information we can get synchronously.
        this.skeletonState(toChatRoomId)

        // Prevent the infinite scroll handler from rendering more messages
        this.ephemeral.messagesInitiated = undefined
        this.ephemeral.messages = []
        this.ephemeral.scrollableDistance = 0
        this.ephemeral.messageHashToMarkUnread = null
        this.ephemeral.chatroomIdToSwitchTo = toChatRoomId

        sbp('chelonia/queueInvocation', toChatRoomId, () => initAfterSynced(toChatRoomId))
      }
    },
    'currentChatRoomReadUntil' (newReadUntil) {
      const msgHash = newReadUntil?.messageHash
      if (msgHash && msgHash === this.ephemeral.messageHashToMarkUnread) {
        this.$nextTick(this.markUnreadPostActions)
      }
    },
    'messageState.contract' (to, from) {
      if (from.messages === to.messages) return
      this.setMessages()
    },
    'ephemeral.renderingChatRoomId' (to) {
      if (!to) return
      this.$nextTick(this.resetObservers)
    },
    'ephemeral.loadingDown' (newVal) {
      // If ephemeral.loadingDown changes, it means that we're dynamically
      // fetching from the server
      this.messageState.fetched = true
      if (newVal) {
        this.jumpToLatest('instant')
      }
    },
    'ephemeral.loadingUp' () {
      // If ephemeral.loadingUp changes, it means that we're dynamically
      // fetching from the server
      this.messageState.fetched = true
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
  position: relative;

  &.is-dnd-active {
    position: relative;
    z-index: 0;
  }
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
  // top-padding '10rem' below is necessary for the message menu list to be displayed properly without being cropped off.
  // (reference: https://github.com/okTurtles/group-income/issues/1818)
  // padding: 10rem 0 1rem 0;
  padding: 0;
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

.c-initializing,
.c-loading {
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

.c-loading {
  position: relative;

  &.is-bottom {
    height: 3.75rem;
  }
}

.c-fill-while-invisible {
  padding: 100%;
}

.c-conversation-start {
  padding-top: 2rem;
}

.c-conversation-end {
  height: 1rem;
}

::v-deep .chat-overlay-target {
  position: absolute;
  z-index: 1;
  bottom: 0;
  left: 0;
  width: 100%;
}

::v-deep .vue-recycle-scroller__item-view {
  & > [data-index="0"] {
    // fix: show full 'actions' overlay (otherwise it gets cropped due to
    // 'overflow: hidden' on the container element)
    margin-top: 1rem;
  }

  &:has(.c-message .c-menu .is-active) {
    // fix: ensure the menu is visible (otherwise, absolute positioning makes
    // it hidden behind other messages)
    z-index: 1;
  }
}

::v-deep .vue-recycle-scroller__item-wrapper {
  &:has(.c-message .c-menu .is-active) {
    // fix: ensure the menu is visible
    overflow: visible;
  }
}
</style>
