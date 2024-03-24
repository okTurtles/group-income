<template lang='pug'>
.c-chat-main(
  v-if='summary.chatRoomId'
  :class='{ "is-dnd-active": dndState && dndState.isActive }'
  @dragstart='dragStartHandler'
  @dragover='dragStartHandler'
)
  drag-active-overlay(
    v-if='dndState && dndState.isActive'
    @drag-ended='dragEndHandler'
  )

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
        ref='infinite-loading'
      )
        div(slot='no-more')
          conversation-greetings(
            :members='summary.numberOfMembers'
            :creatorID='summary.attributes.creatorID'
            :type='summary.attributes.type'
            :joined='summary.isJoined'
            :name='summary.title'
            :description='summary.attributes.description'
          )
        div(slot='no-results')
          conversation-greetings(
            :members='summary.numberOfMembers'
            :creatorID='summary.attributes.creatorID'
            :type='summary.attributes.type'
            :joined='summary.isJoined'
            :name='summary.title'
            :description='summary.attributes.description'
          )

      template(v-for='(message, index) in messages')
        .c-divider(
          v-if='changeDay(index) || isNew(message.hash)'
          :class='{"is-new": isNew(message.hash)}'
          :key='`date-${index}`'
        )
          i18n.c-new(v-if='isNew(message.hash)' :class='{"is-new-date": changeDay(index)}') New
          span(v-else-if='changeDay(index)') {{proximityDate(message.datetime)}}

        component(
          :is='messageType(message)'
          :ref='message.hash'
          :key='message.hash'
          :height='message.height'
          :messageId='message.id'
          :messageHash='message.hash'
          :text='message.text'
          :attachments='message.attachments'
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
          :currentUserID='currentUserAttr.id'
          :avatar='avatar(message.from)'
          :variant='variant(message)'
          :isSameSender='isSameSender(index)'
          :isMsgSender='isMsgSender(message.from)'
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
      ref='sendArea'
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
import { Vue } from '@common/common.js'
import Avatar from '@components/Avatar.vue'
import InfiniteLoading from 'vue-infinite-loading'
import Message from './Message.vue'
import MessageInteractive from './MessageInteractive.vue'
import MessageNotification from './MessageNotification.vue'
import MessagePoll from './MessagePoll.vue'
import ConversationGreetings from '@containers/chatroom/ConversationGreetings.vue'
import SendArea from './SendArea.vue'
import ViewArea from './ViewArea.vue'
import Emoticons from './Emoticons.vue'
import DragActiveOverlay from './file-attachment/DragActiveOverlay.vue'
import {
  MESSAGE_TYPES,
  MESSAGE_VARIANTS,
  CHATROOM_ACTIONS_PER_PAGE,
  CHATROOM_MAX_ARCHIVE_ACTION_PAGES
} from '@model/contracts/shared/constants.js'
import { findMessageIdx, createMessage } from '@model/contracts/shared/functions.js'
import { proximityDate, MINS_MILLIS } from '@model/contracts/shared/time.js'
import { cloneDeep, debounce, throttle } from '@model/contracts/shared/giLodash.js'
import { EVENT_HANDLED } from '~/shared/domains/chelonia/events.js'
import { objectURLtoBlob } from '@utils/image.js'

const collectEventStream = async (s: ReadableStream) => {
  const reader = s.getReader()
  const r = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    r.push(value)
  }
  return r
}

const ignorableScrollDistanceInPixel = 500

// The following methods are wrapped inside `debounce`, which requires calling
// flush before the references used go away, like when switching groups.
// Vue.js binds methods, which means that properties like `.flush` become
// inaccessible. So, instead we define these methods outside the component and
// manually bind them in `mounted`.
const onChatScroll = function () {
  if (!this.$refs.conversation) {
    return
  }
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
    // const parentOffsetTop = this.$refs[msg.hash][0].$el.offsetParent.offsetTop
    const height = this.$refs[msg.hash][0].$el.clientHeight
    if (offsetTop + height <= curScrollBottom) {
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

  if (this.ephemeral.scrolledDistance > ignorableScrollDistanceInPixel) {
    // Save the current scroll position per each chatroom
    for (let i = 0; i < this.messages.length - 1; i++) {
      const msg = this.messages[i]
      const offsetTop = this.$refs[msg.hash][0].$el.offsetTop
      const scrollMarginTop = parseFloat(window.getComputedStyle(this.$refs[msg.hash][0].$el).scrollMarginTop || 0)
      if (offsetTop - scrollMarginTop > curScrollTop) {
        sbp('state/vuex/commit', 'setChatRoomScrollPosition', {
          chatRoomId: this.currentChatRoomId,
          messageHash: msg.hash
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
}

export default ({
  name: 'ChatMain',
  components: {
    Avatar,
    ConversationGreetings,
    Emoticons,
    InfiniteLoading,
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
        scrolledDistance: 0,
        infiniteLoading: null,
        // NOTE: messagesInitiated describes if the messages are fully re-rendered
        //       according to this, we could display loading/skeleton component
        messagesInitiated: undefined,
        // NOTE: Since the this.currentChatRoomId is a getter which can be changed anytime.
        //       We can not use this.currentChatRoomId to point the current-rendering-chatRoomId
        //       because it takes some time to render the chatroom which is enough for this.currentChatRoomId to be changed
        //       We initiate the chatroom state when we open or switch a chatroom, so we can say that
        //       the current-rendering-chatroom is the chatroom whose state is initiated for the last time.
        renderingChatRoomId: null,
        replyingMessage: null,
        replyingMessageHash: null,
        replyingTo: null,
        unprocessedEvents: []
      },
      messageState: {
        contract: {},
        prevFrom: null,
        prevTo: null
      },
      dndState: {
        // drag & drop releated state
        isActive: false
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
    // Bind debounced methods
    this.ephemeral.onChatScroll = debounce(onChatScroll.bind(this), 500)
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
    try {
      // Before destroying the component and its state, we save the current
      // scroll position if there's something so save.
      this.ephemeral.onChatScroll.flush()
    } catch (e) {
      console.error('ChatMain.vue: Error while flushing onChatScroll in beforeDestroy', e)
    }
    this.archiveMessageState()
  },
  computed: {
    ...mapGetters([
      'currentChatRoomId',
      'chatRoomSettings',
      'chatRoomAttributes',
      'chatRoomMembers',
      'ourIdentityContractId',
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
      return this.ephemeral.scrolledDistance > ignorableScrollDistanceInPixel
    },
    messages () {
      return this.messageState.contract?.messages || []
    }
  },
  methods: {
    proximityDate,
    checkEventSourceConsistency (contractID) {
      if (contractID !== this.summary.chatRoomId) {
        console.info(`Received an event for contract ID ${contractID}, but we're currently in chatroom ID ${this.summary.chatRoomId}; avoiding any further processing`)
        return false
      }

      return true
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
      return user?.displayName || user?.username || message.from
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
    handleSendMessage (text, attachments) {
      const hasAttachments = attachments?.length > 0
      const contractID = this.currentChatRoomId
      const replyingMessage = this.ephemeral.replyingMessageHash
        ? { hash: this.ephemeral.replyingMessageHash, text: this.ephemeral.replyingMessage }
        : null

      const data = { type: MESSAGE_TYPES.TEXT, text }
      if (replyingMessage) {
        // If not replying to a message, use original data; otherwise, append
        // replyingMessage to data.
        data.replyingMessage = replyingMessage
      }

      const sendMessage = (beforePrePublish) => {
        const prepublish = (message) => {
          if (!this.checkEventSourceConsistency(contractID)) return

          beforePrePublish?.()

          // IMPORTANT: This is executed *BEFORE* the message is received over
          // the network
          sbp('okTurtles.eventQueue/queueEvent', 'chatroom-events', async () => {
            if (!this.checkEventSourceConsistency(contractID)) return
            Vue.set(this.messageState, 'contract', await sbp('chelonia/in/processMessage', message, this.messageState.contract))
          }).catch((e) => {
            console.error('Error sending message during pre-publish: ' + e.message)
          })

          this.stopReplying()
          this.updateScroll()
        }
        const beforeRequest = (message, oldMessage) => {
          if (!this.checkEventSourceConsistency(contractID)) return
          sbp('okTurtles.eventQueue/queueEvent', 'chatroom-events', () => {
            if (!this.checkEventSourceConsistency(contractID)) return
            const messageStateContract = this.messageState.contract
            const msg = messageStateContract.messages.find(m => (m.hash === oldMessage.hash()))
            if (!msg) return
            msg.hash = message.hash()
            msg.height = message.height()
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
            prepublish,
            beforeRequest
          }
        }).catch((e) => {
          // TODO: add Retry button on the right side
          console.error(`Error while publishing message for ${contractID}`, e)
          alert(e?.message || e)
        })
      }
      const uploadAttachments = async () => {
        try {
          const attachmentsToSend = await Promise.all(attachments.map(async (attachment) => {
            const { mimeType, url, name } = attachment
            // url here is an instance of URL.createObjectURL(), which needs to be converted to a 'Blob'
            const attachmentBlob = await objectURLtoBlob(url)
            const downloadData = await sbp('chelonia/fileUpload', attachmentBlob, {
              type: mimeType, cipher: 'aes256gcm'
            })
            return { name, mimeType, downloadData }
          }))
          data.attachments = attachmentsToSend

          return true
        } catch (e) {
          console.log('[ChatMain.vue]: something went wrong while uploading attachments ', e)
          return false
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
            preSendCheck: (message, state) => {
              // NOTE: this preSendCheck does nothing except appending a pending message
              //       temporarily until the uploading attachments is finished
              //       it always returns false, so it doesn't affect the contract state
              const [, opV] = message.op()
              const { meta } = opV.valueOf().valueOf()

              temporaryMessage = createMessage({
                meta,
                data: { ...data, attachments },
                hash: message.hash(),
                height: message.height(),
                state: this.messageState.contract,
                pending: true,
                innerSigningContractID: this.ourIdentityContractId
              })
              this.messageState.contract.messages.push(temporaryMessage)
              this.updateScroll()

              return false
            }
          }
        }).then(async () => {
          const isUploaded = await uploadAttachments()
          if (isUploaded) {
            const removeTemporaryMessage = () => {
              // NOTE: remove temporary message which is created before uploading attachments
              if (temporaryMessage) {
                const msgIndex = findMessageIdx(temporaryMessage.hash, this.messageState.contract.messages)
                this.messageState.contract.messages.splice(msgIndex, 1)
              }
            }
            sendMessage(removeTemporaryMessage)
          } else {
            temporaryMessage.hasFailed = true
          }
        })
      }
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
        const contractID = this.summary.chatRoomId
        const limit = this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE
        const events = await collectEventStream(sbp('chelonia/out/eventsBetween', contractID, messageHash, this.messages[0].height, limit / 2)).catch((e) => {
          console.debug(`Error fetching events or message ${messageHash} doesn't belong to ${contractID}`)
        })
        if (!this.checkEventSourceConsistency(contractID)) return
        if (events && events.length) {
          await this.rerenderEvents(events)

          if (!this.checkEventSourceConsistency(contractID)) return
          const msgIndex = findMessageIdx(messageHash, this.messages)
          if (msgIndex >= 0) {
            scrollAndHighlight(msgIndex)
          } else {
            // this is when the target message is deleted after reply message
            // should let user know the target message is deleted
            console.debug(`Message ${messageHash} is removed from ${contractID}`)
          }
        }
      }
    },
    updateScroll (scrollTargetMessage = null, effect = false) {
      const contractID = this.summary.chatRoomId
      if (contractID) {
        // force conversation viewport to be at the bottom (most recent messages)
        setTimeout(() => {
          if (scrollTargetMessage) {
            if (!this.checkEventSourceConsistency(contractID)) return
            this.scrollToMessage(scrollTargetMessage, effect)
          } else {
            this.jumpToLatest()
          }
        }, 100)
      }
    },
    jumpToLatest (behavior = 'smooth') {
      if (this.$refs.conversation) {
        this.$refs.conversation.scroll({
          left: 0,
          top: this.$refs.conversation.scrollHeight,
          behavior
        })
      }
    },
    retryMessage (index) {
      const message = cloneDeep(this.messageState.contract.messages[index])
      this.messageState.contract.messages.splice(index, 1)
      this.handleSendMessage(message.text, message.attachments)
    },
    replyMessage (message) {
      this.ephemeral.replyingMessage = message.text
      this.ephemeral.replyingMessageHash = message.hash
      this.ephemeral.replyingTo = this.who(message)
    },
    editMessage (message, newMessage) {
      message.text = newMessage
      message.pending = true
      const contractID = this.currentChatRoomId
      sbp('gi.actions/chatroom/editMessage', {
        contractID,
        data: {
          hash: message.hash,
          createdDate: message.datetime,
          text: newMessage
        }
      }).catch((e) => {
        console.error(`Error while editing message for ${contractID}`, e)
      })
    },
    deleteMessage (message) {
      const contractID = this.currentChatRoomId
      sbp('gi.actions/chatroom/deleteMessage', {
        contractID: this.currentChatRoomId,
        data: { hash: message.hash }
      }).catch((e) => {
        console.error(`Error while deleting message for ${contractID}`, e)
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
      const contractID = this.currentChatRoomId
      sbp('gi.actions/chatroom/makeEmotion', {
        contractID: this.currentChatRoomId,
        data: { hash: message.hash, emoticon }
      }).catch((e) => {
        console.error(`Error while adding emotion for ${contractID}`, e)
      })
    },
    initializeState () {
      // NOTE: this state is rendered using the chatroom contract functions
      // so should be CAREFUL of updating the fields
      try {
        // Before initializing the state, we save the current scroll position
        // if there's something so save.
        this.ephemeral.onChatScroll.flush()
      } catch (e) {
        console.error('ChatMain.vue: Error while flushing onChatScroll in initializeState', e)
      }
      Vue.set(this.messageState, 'contract', {
        settings: cloneDeep(this.chatRoomSettings),
        attributes: cloneDeep(this.chatRoomAttributes),
        users: cloneDeep(this.chatRoomMembers),
        _vm: cloneDeep(this.currentChatVm),
        messages: [],
        onlyRenderMessage: true // NOTE: DO NOT RENAME THIS OR CHATROOM WOULD BREAK
      })
    },
    /**
     * Load/render events for one or more pages
     * @return {boolean | undefined} The return value is used to change the state inside the function 'infiniteHandler'
     * true: Loaded all the messages, and no more messages exists
     * false: Messages are loaded, but more messages exist
     * undefined: Loaded the wrong events from the server so those events should be ignoreed
     *            and no state changes are needed (like messagesInitiated). Since the renderingChatRoomId could be changed
     *            while processing this function, this function could do the redundant process. This normally happens
     *            when user switches channels very fast.
    */
    async renderMoreMessages () {
      // NOTE: 'this.renderingChatRoomId' can be changed while running this function
      //       we save it in the contant variable 'chatRoomId'
      const chatRoomId = this.renderingChatRoomId
      // NOTE: messagesInitiated describes if the messages should be fully removed and re-rendered
      //       it's true when user gets entered channel page or switches to another channel
      if (!this.ephemeral.messagesInitiated) {
        await this.loadMessagesFromStorage(chatRoomId)
        if (!this.checkEventSourceConsistency(chatRoomId)) return
      }
      const limit = this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE
      /***
       * if the removed message was the first unread messages(currentChatRoomReadUntil)
       * we can load message of that hash(messageHash) but not scroll
       * because it doesn't exist in this.messages
       * So in this case, we will load messages until the first unread mention
       * and scroll to that message
       */
      let unreadPosition = null
      if (this.currentChatRoomReadUntil) {
        if (!this.currentChatRoomReadUntil.deletedDate) {
          unreadPosition = this.currentChatRoomReadUntil.messageHash
        } else if (this.chatRoomUnreadMentions(chatRoomId).length) {
          unreadPosition = this.chatRoomUnreadMentions(chatRoomId)[0].messageHash
        }
      }
      const {
        mhash = '' // mhash is a query for scrolling to a particular message when chat-room is done with the initial render. (refer to 'copyMessageLink' method in MessageBase.vue)
      } = this.$route.query
      const messageHashToScroll = mhash || this.currentChatRoomScrollPosition || unreadPosition
      let events = []
      const isLoadedFromStorage = !this.ephemeral.messagesInitiated && this.latestEvents.length
      if (isLoadedFromStorage) {
        const prevLastEvent = this.messageState.prevTo // NOTE: check loadMessagesFromStorage function
        const newEventsStream = sbp('chelonia/out/eventsAfter', chatRoomId, prevLastEvent.height, undefined, prevLastEvent.hash)
        const newEventsStreamReader = newEventsStream.getReader()
        await sbp('okTurtles.eventQueue/queueEvent', 'chatroom-events', async () => {
          // NOTE: discard the first event, since it already exists in
          // this.latestEvents
          const { done } = await newEventsStreamReader.read()
          if (done) return
          if (!this.checkEventSourceConsistency(chatRoomId)) return

          for (;;) {
            const { done, value: event } = await newEventsStreamReader.read()
            if (done) break

            const state = this.messageState.contract
            const newState = await sbp('chelonia/in/processMessage', event, state)

            if (!this.checkEventSourceConsistency(chatRoomId)) return

            Vue.set(this.messageState, 'contract', newState)
            this.latestEvents.push(event)
          }

          this.$forceUpdate()
        }).catch(e => {
          console.error('[ChatMain.vue] Error processing events at renderMoreMessages', e)
        }).finally(() => {
          newEventsStreamReader.releaseLock()
        })
      } else {
        if (!this.ephemeral.messagesInitiated && messageHashToScroll) {
          const { height: latestHeight } = await sbp('chelonia/out/latestHEADInfo', chatRoomId)
          if (!this.checkEventSourceConsistency(chatRoomId)) return
          events = await collectEventStream(sbp('chelonia/out/eventsBetween', chatRoomId, messageHashToScroll, latestHeight, limit))
        } else if (!this.ephemeral.messagesInitiated || !this.latestEvents.length) {
          const { height: latestHeight } = await sbp('chelonia/out/latestHEADInfo', chatRoomId)
          if (!this.checkEventSourceConsistency(chatRoomId)) return
          events = await collectEventStream(sbp('chelonia/out/eventsBefore', chatRoomId, latestHeight, limit))
        } else {
          const beforeHeight = GIMessage.deserializeHEAD(this.latestEvents[0]).head.height
          events = await collectEventStream(sbp('chelonia/out/eventsBefore', chatRoomId, beforeHeight, limit))
        }
      }

      if (!this.checkEventSourceConsistency(chatRoomId)) return

      if (!isLoadedFromStorage) {
        // NOTE: already rendered above in this function
        await this.rerenderEvents(events)
        if (!this.checkEventSourceConsistency(chatRoomId)) return
      }

      if (!this.ephemeral.messagesInitiated) {
        this.setStartNewMessageIndex()
        this.updateScroll(messageHashToScroll, Boolean(mhash)) // We do want the 'c-focused' animation if there is a message-scroll query.
        return false
      }

      return events.length < limit
    },
    rerenderEvents (events) {
      const contractID = this.summary.chatRoomId

      if (!this.ephemeral.messagesInitiated || this.latestEvents.length === 0) {
        this.latestEvents = events
      } else if (events.length > 1) {
        events.pop() // remove duplication. For more detail, check sbp('chelonia/out/eventsBetween')
        this.latestEvents.unshift(...events)
      }

      this.initializeState()

      // This ensures that `this.latestEvents.push(event)` below happens in order
      return sbp('okTurtles.eventQueue/queueEvent', 'chatroom-events', async () => {
        if (!this.checkEventSourceConsistency(contractID)) return

        const latestEvents = this.latestEvents
        if (latestEvents.length > 0) {
          for (const event of latestEvents) {
            const state = this.messageState.contract
            const newState = await sbp('chelonia/in/processMessage', event, state)

            if (!this.checkEventSourceConsistency(contractID)) return

            Vue.set(this.messageState, 'contract', newState)
          }
          this.$forceUpdate()
        }
      })
    },
    async loadMessagesFromStorage (chatRoomId) {
      const prevState = await sbp('gi.db/archive/load', this.archiveKeyFromChatRoomId(chatRoomId))
      if (!this.checkEventSourceConsistency(chatRoomId)) return

      const latestEvents = prevState ? JSON.parse(prevState) : []
      if (latestEvents.length) {
        const deserializedHEADfirst = GIMessage.deserializeHEAD(latestEvents[0])
        const deserializedHEADlast = GIMessage.deserializeHEAD(latestEvents[latestEvents.length - 1])
        this.messageState.prevFrom = { hash: deserializedHEADfirst.hash, height: deserializedHEADfirst.head.height }
        this.messageState.prevTo = { hash: deserializedHEADlast.hash, height: deserializedHEADlast.head.height }
      } else {
        this.messageState.prevFrom = null
        this.messageState.prevTo = null
      }

      await this.rerenderEvents(latestEvents)
    },
    setInitMessages () {
      if (this.renderingChatRoomId === this.currentChatRoomId) {
        return
      }
      this.initializeState()
      this.ephemeral.messagesInitiated = false
      this.ephemeral.unprocessedEvents = []
      this.renderingChatRoomId = this.currentChatRoomId
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
    listenChatRoomActions (contractID: string, message?: GIMessage) {
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

      if (message) {
        this.ephemeral.unprocessedEvents.push(message)
      }

      if (!this.ephemeral.messagesInitiated) {
        return
      }

      this.ephemeral.unprocessedEvents.splice(0).forEach((message) => {
      // TODO: The next line will _not_ get information about any inner signatures,
      // which is used for determininng the sender of a message. Update with
      // another call to GIMessage to get signature information
        const value = message.decryptedValue()
        if (!value) throw new Error('Unable to decrypt message')

        const isMessageAddedOrDeleted = (message: GIMessage) => {
          if (![GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_ACTION_UNENCRYPTED].includes(message.opType())) return {}

          const { action } = value
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

        // This ensures that `this.latestEvents.push(serializedMessage)` below
        // happens in order
        sbp('okTurtles.eventQueue/queueEvent', 'chatroom-events', async () => {
          if (!this.checkEventSourceConsistency(contractID)) return

          // Messages are processed twice: before sending (outgoing direction,
          // pending status) and then again when received from the server
          // (incoming direction)
          if (message.direction() === 'incoming') {
            // For incoming messages that aren't pending, we skip them
            const msgIndex = findMessageIdx(message.hash(), this.messages)
            if (msgIndex !== -1 && !this.messages[msgIndex].pending) {
              // Message was already processed
              return
            }
          }

          if (addedOrDeleted === 'DELETED') {
          // NOTE: Message will be deleted in processMessage function
          //       but need to make animation to delete it, probably here
            const messageHash = value.data.hash
            const msgIndex = findMessageIdx(messageHash, this.messages)
            if (msgIndex !== -1) {
              document.querySelectorAll('.c-body-conversation > .c-message')[msgIndex]?.classList.add('c-disappeared')

              // NOTE: waiting for the animation is done
              //       it's duration is 500ms described in MessageBase.vue
              await new Promise(resolve => setTimeout(resolve, 500))
              if (!this.checkEventSourceConsistency(contractID)) return
            }
          }

          const serializedMessage = message.serialize()

          const newContractState = await sbp('chelonia/in/processMessage', serializedMessage, this.messageState.contract)

          if (!this.checkEventSourceConsistency(contractID)) return
          Vue.set(this.messageState, 'contract', newContractState)

          this.latestEvents.push(serializedMessage)

          this.$forceUpdate()

          if (this.ephemeral.scrolledDistance < 50) {
            if (addedOrDeleted === 'ADDED' && this.messages.length) {
              const isScrollable = this.$refs.conversation &&
              this.$refs.conversation.scrollHeight !== this.$refs.conversation.clientHeight
              const fromOurselves = this.isMsgSender(this.messages[this.messages.length - 1].from)
              if (!fromOurselves && isScrollable) {
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
        })
      })
    },
    resizeEventHandler () {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)

      if (this.ephemeral.scrolledDistance < 40) {
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
    infiniteHandler ($state) {
      this.ephemeral.infiniteLoading = $state
      if (this.ephemeral.messagesInitiated === undefined) {
        // NOTE: this infinite handler is being called once which should be ignored
        //       before calling the setInitMessages function
        return
      } else if (this.currentChatRoomId !== this.renderingChatRoomId) {
        // NOTE: should ignore to render messages before chatroom state is initiated
        return
      }
      const chatRoomId = this.currentChatRoomId
      sbp('okTurtles.eventQueue/queueEvent', 'chatroom-events', () => {
        if (!this.checkEventSourceConsistency(chatRoomId)) return

        this.renderMoreMessages().then(completed => {
          if (!this.checkEventSourceConsistency(chatRoomId)) return

          if (completed === true) {
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
          } else if (completed === false) {
            $state.loaded()
          }
          if (completed !== undefined) {
          // NOTE: 'this.ephemeral.messagesInitiated' can be set true only when renderMoreMessages are successfully proceeded
            this.ephemeral.messagesInitiated = true
            this.listenChatRoomActions(chatRoomId)
          }
        }).catch(e => {
          console.error('ChatMain infiniteHandler() error:', e)
        })
      })
    },
    // We need this method wrapper to avoid ephemeral.onChatScroll being undefined
    onChatScroll () {
      this.ephemeral.onChatScroll()
    },
    archiveMessageState () {
      // Copy of a reference to this.latestEvents to ensure it doesn't change
      const latestEvents = this.latestEvents
      if (latestEvents.length === 0) {
        return
      }
      const unit = this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE
      const fromEvent = GIMessage.deserializeHEAD(latestEvents[0])
      const toEvent = GIMessage.deserializeHEAD(latestEvents[latestEvents.length - 1])

      // Get the chatroom ID from the event to ensure that it's consistent with
      // what will be stored
      const chatRoomId = fromEvent.contractID

      if (!this.isJoinedChatRoom(chatRoomId)) return

      const from = fromEvent.hash
      const to = toEvent.hash

      // NOTE: save messages in the browser storage, but not more than CHATROOM_MAX_ARCHIVE_ACTION_PAGES pages of events
      if (latestEvents.length >= CHATROOM_MAX_ARCHIVE_ACTION_PAGES * unit) {
        sbp('gi.db/archive/delete', this.archiveKeyFromChatRoomId(chatRoomId))
      } else if (to !== this.messageState.prevTo?.hash || from !== this.messageState.prevFrom?.hash) {
        // this.currentChatRoomId could be wrong when the channels are switched very fast
        // so it's good to initiate using input parameter chatRoomId
        sbp('gi.db/archive/save', this.archiveKeyFromChatRoomId(chatRoomId), JSON.stringify(latestEvents))
      }
    },
    archiveKeyFromChatRoomId (chatRoomId) {
      return `messages/${this.ourIdentityContractId}/${chatRoomId}`
    },
    // This debounced method is debounced precisely while switching groups
    // to avoid unnecessary re-rendering, and therefore is fine as is and
    // doesn't need to be flushed
    refreshContent: debounce(function () {
      // NOTE: using debounce we can skip unnecessary rendering contents
      this.archiveMessageState()
      this.setInitMessages()
    }, 250),
    // Handlers for file-upload via drag & drop action
    dragStartHandler (e) {
      // handler function for 'dragstart', 'dragover' events
      const items = Array.from(e?.dataTransfer?.items) || []

      if (items.some(entry => entry.kind === 'file')) { // check if the detected content is something attachable to the chat.
        if (!this.dndState.isActive) {
          this.dndState.isActive = true
        }

        // give user a correct feedback about what happens upon 'drop' action. (https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
        e.dataTransfer.dropEffect = 'copy'
      }
    },
    dragEndHandler (e) {
      // handler function for 'dragleave', 'dragend', 'drop' events
      e.preventDefault()

      if (this.dndState.isActive) {
        this.dndState.isActive = false

        e?.dataTransfer.files?.length &&
          this.$refs.sendArea.fileAttachmentHandler(e?.dataTransfer.files, true)
      }
    }
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

      const initAfterSynced = (toChatRoomId) => {
        if (toChatRoomId !== this.summary.chatRoomId || this.ephemeral.messagesInitiated) return
        this.setInitMessages()
      }

      if (toChatRoomId !== fromChatRoomId) {
        this.initializeState()
        this.ephemeral.messagesInitiated = false
        this.ephemeral.scrolledDistance = 0
        if (sbp('chelonia/contract/isSyncing', toChatRoomId)) {
          this.archiveMessageState()
          toIsJoined && sbp('chelonia/queueInvocation', toChatRoomId, () => initAfterSynced(toChatRoomId))
        } else {
          this.refreshContent()
        }
      } else if (toIsJoined && toIsJoined !== fromIsJoined) {
        sbp('chelonia/queueInvocation', toChatRoomId, () => initAfterSynced(toChatRoomId))
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
  padding: 10rem 0 1rem 0;
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
