<template lang='pug'>
.c-chat-main(
  v-if='summary.chatRoomID'
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
          :emoticonsList='message.emoticons'
          :who='who(message)'
          :currentUserID='currentUserAttr.id'
          :avatar='avatar(message.from)'
          :variant='variant(message)'
          :pinnedBy='message.pinnedBy'
          :isSameSender='isSameSender(index)'
          :isMsgSender='isMsgSender(message.from)'
          :isGroupCreator='isGroupCreator'
          :class='{removed: message.delete}'
          @retry='retryMessage(index)'
          @reply='replyMessage(message)'
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
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { GIMessage } from '~/shared/domains/chelonia/chelonia.js'
import { Vue, L } from '@common/common.js'
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
import TouchLinkHelper from './TouchLinkHelper.vue'
import DragActiveOverlay from './file-attachment/DragActiveOverlay.vue'
import { MESSAGE_TYPES, MESSAGE_VARIANTS, CHATROOM_ACTIONS_PER_PAGE } from '@model/contracts/shared/constants.js'
import { CHATROOM_EVENTS } from '@utils/events.js'
import { findMessageIdx, createMessage } from '@model/contracts/shared/functions.js'
import { proximityDate, MINS_MILLIS } from '@model/contracts/shared/time.js'
import { cloneDeep, debounce, throttle, delay } from '@model/contracts/shared/giLodash.js'
import { EVENT_HANDLED } from '~/shared/domains/chelonia/events.js'

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
  // NOTE: Should be careful of using the currentChatRoomState
  //       since those states are depends on the currentChatRoomId, not renderingChatRoomId
  if (!this.$refs.conversation || !this.summary.isJoined) {
    return
  }

  const curScrollTop = this.$refs.conversation.scrollTop
  const curScrollBottom = curScrollTop + this.$refs.conversation.clientHeight
  const scrollTopMax = this.$refs.conversation.scrollHeight - this.$refs.conversation.clientHeight
  this.ephemeral.scrolledDistance = scrollTopMax - curScrollTop

  for (let i = this.messages.length - 1; i >= 0; i--) {
    const msg = this.messages[i]
    if (msg.pending || msg.hasFailed) continue
    const offsetTop = this.$refs[msg.hash][0].$el.offsetTop
    // const parentOffsetTop = this.$refs[msg.hash][0].$el.offsetParent.offsetTop
    const height = this.$refs[msg.hash][0].$el.clientHeight
    if (offsetTop + height <= curScrollBottom) {
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

  if (!this.ephemeral.messagesInitiated && this.renderingChatRoomId) {
    return
  }

  if (this.ephemeral.scrolledDistance > ignorableScrollDistanceInPixel) {
    // Save the current scroll position per each chatroom
    for (let i = 0; i < this.messages.length - 1; i++) {
      const msg = this.messages[i]
      if (msg.pending || msg.hasFailed) continue
      const offsetTop = this.$refs[msg.hash][0].$el.offsetTop
      const scrollMarginTop = parseFloat(window.getComputedStyle(this.$refs[msg.hash][0].$el).scrollMarginTop || 0)
      if (offsetTop - scrollMarginTop > curScrollTop) {
        sbp('state/vuex/commit', 'setChatRoomScrollPosition', {
          chatRoomID: this.renderingChatRoomId,
          messageHash: msg.hash
        })
        break
      }
    }
  } else if (this.currentChatRoomScrollPosition) {
    sbp('state/vuex/commit', 'setChatRoomScrollPosition', {
      chatRoomID: this.renderingChatRoomId,
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
    TouchLinkHelper,
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
        onChatScroll: null,
        infiniteLoading: null,
        // NOTE: messagesInitiated describes if the messages are fully re-rendered
        //       according to this, we could display loading/skeleton component
        messagesInitiated: undefined,
        // NOTE: Since the this.currentChatRoomId is a getter which can be changed anytime.
        //       We can not use this.currentChatRoomId to point the current-rendering-chatRoomID
        //       because it takes some time to render the chatroom which is enough for this.currentChatRoomId to be changed
        //       We initiate the chatroom state when we open or switch a chatroom, so we can say that
        //       the current-rendering-chatroom is the chatroom whose state is initiated for the last time.
        renderingChatRoomId: null,
        replyingMessage: null,
        replyingTo: null,
        unprocessedEvents: []
      },
      messageState: {
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
      'currentChatRoomReadUntil'
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
    },
    isGroupCreator () {
      if (!this.isGroupDirectMessage(this.summary.chatRoomID)) {
        return this.currentUserAttr.id === this.currentGroupOwnerID
      }
      return false
    }
  },
  methods: {
    proximityDate,
    checkEventSourceConsistency (contractID) {
      if (contractID !== this.summary.chatRoomID) {
        console.info(`Received an event for contract ID ${contractID}, but we're currently in chatroom ID ${this.summary.chatRoomID}; avoiding any further processing`)
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
    replyingMessageText (message) {
      return message.replyingMessage?.text || ''
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
      this.ephemeral.replyingTo = null
    },
    handleSendMessage (text, attachments, replyingMessage) {
      const hasAttachments = attachments?.length > 0
      const contractID = this.renderingChatRoomId

      const data = { type: MESSAGE_TYPES.TEXT, text }
      if (replyingMessage) {
        // NOTE: If not replying to a message, use original data; otherwise, append replyingMessage to data.
        data.replyingMessage = replyingMessage
        // NOTE: for the messages with only images, the text should be updated with file name
        if (!replyingMessage.text) {
          const msg = this.messages.find(m => (m.hash === replyingMessage.hash))
          if (msg) {
            data.replyingMessage.text = msg.attachments[0].name
          }
        }
      }

      const sendMessage = (beforePrePublish) => {
        let pendingMessageHash = null
        const beforeRequest = (message, oldMessage) => {
          if (!this.checkEventSourceConsistency(contractID)) return
          sbp('okTurtles.eventQueue/queueEvent', CHATROOM_EVENTS, async () => {
            if (!this.checkEventSourceConsistency(contractID)) return

            beforePrePublish?.()

            // IMPORTANT: This is executed *BEFORE* the message is received over
            // the network
            const msg = this.messages.find(m => (m.hash === oldMessage.hash()))
            if (!msg) {
              Vue.set(this.messageState, 'contract', await sbp('chelonia/in/processMessage', message, this.messageState.contract))
              this.stopReplying()
              this.updateScroll()
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
            const msgIndex = findMessageIdx(pendingMessageHash, this.messages)
            if (msgIndex > 0) {
              Vue.set(this.messages[msgIndex], 'hasFailed', true)
            }
          }
        })
      }
      const uploadAttachments = async () => {
        try {
          data.attachments = await sbp('gi.actions/identity/uploadFiles', {
            attachments,
            billableContractID: contractID
          })
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
              this.messages.push(temporaryMessage)

              this.stopReplying()
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
                const msgIndex = findMessageIdx(temporaryMessage.hash, this.messages)
                this.messages.splice(msgIndex, 1)
              }
            }
            sendMessage(removeTemporaryMessage)
          } else {
            Vue.set(temporaryMessage, 'hasFailed', true)
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
        const contractID = this.summary.chatRoomID
        const limit = this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE
        const events = await collectEventStream(
          // FIX: this.messages[0].height could not be the starting height of the events in the page
          sbp('chelonia/out/eventsBetween', contractID, messageHash, this.messages[0].height, limit / 2)
        ).catch((e) => {
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
      const contractID = this.summary.chatRoomID
      if (contractID) {
        return new Promise((resolve) => {
          // force conversation viewport to be at the bottom (most recent messages)
          setTimeout(async () => {
            if (scrollTargetMessage) {
              if (!this.checkEventSourceConsistency(contractID)) return
              await this.scrollToMessage(scrollTargetMessage, effect)
            } else {
              this.jumpToLatest()
            }

            resolve()
          }, 100)
        })
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
      const message = cloneDeep(this.messages[index])
      this.messages.splice(index, 1)
      this.handleSendMessage(message.text, message.attachments, message.replyingMessage)
    },
    replyMessage (message) {
      const { text, hash } = message
      this.ephemeral.replyingMessage = { text, hash }
      this.ephemeral.replyingTo = this.who(message)
    },
    editMessage (message, newMessage) {
      message.text = newMessage
      message.pending = true
      const contractID = this.renderingChatRoomId
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
      const contractID = this.renderingChatRoomId
      sbp('gi.actions/chatroom/pinMessage', {
        contractID,
        data: { message }
      }).catch((e) => {
        console.error(`Error while pinning message(${message.hash}) in chatroom(${contractID})`, e)
      })
    },
    async unpinFromChannel (hash) {
      const contractID = this.renderingChatRoomId

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
      const contractID = this.renderingChatRoomId
      const manifestCids = (message.attachments || []).map(attachment => attachment.downloadData.manifestCid)
      const question = message.attachments?.length
        ? L('Are you sure you want to delete this message and it\'s file attachments permanently?')
        : L('Are you sure you want to delete this message permanently?')

      const promptConfig = {
        heading: L('Delete message'),
        question,
        primaryButton: L('Yes'),
        secondaryButton: L('Cancel')
      }

      const primaryButtonSelected = await sbp('gi.ui/prompt', promptConfig)
      if (primaryButtonSelected) {
        sbp('gi.actions/chatroom/deleteMessage', {
          contractID,
          data: { hash: message.hash, manifestCids, messageSender: message.from }
        }).catch((e) => {
          console.error(`Error while deleting message(${message.hash}) for chatroom(${contractID})`, e)
        })
      }
    },
    async deleteAttachment (message, manifestCid) {
      const contractID = this.currentChatRoomId
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

      if (primaryButtonSelected) {
        const data = { hash, manifestCid, messageSender: from }
        sbp('gi.actions/chatroom/deleteAttachment', { contractID, data }).catch((e) => {
          console.error(`Error while deleting attachment(${manifestCid}) of message(${hash}) for chatroom(${contractID})`, e)
        })
      }
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
      const contractID = this.renderingChatRoomId
      sbp('gi.actions/chatroom/makeEmotion', {
        contractID,
        data: { hash: message.hash, emoticon }
      }).catch((e) => {
        console.error(`Error while adding emotion for ${contractID}`, e)
      })
    },
    generateNewChatRoomState (shouldClearMessages = false, height) {
      const state = sbp('chelonia/contract/state', this.renderingChatRoomId, height) || {}
      return {
        settings: state.settings || {},
        attributes: state.attributes || {},
        members: state.members || {},
        _vm: state._vm,
        messages: shouldClearMessages ? [] : state.messages,
        pinnedMessages: [], // NOTE: We don't use this pinnedMessages, but initialize so that the process functions won't break
        renderingContext: true // NOTE: DO NOT RENAME THIS OR CHATROOM WOULD BREAK
      }
    },
    initializeState (forceClearMessages = false) {
      // NOTE: this state is rendered using the chatroom contract functions
      //       so should be CAREFUL of updating the fields
      this.latestEvents = []
      Vue.set(this.messageState, 'contract', this.generateNewChatRoomState(forceClearMessages))
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
      //       we save it in the contant variable 'chatRoomID'
      //       'this.ephemeral.messagesInitiated' describes if the messages should be fully removed and re-rendered
      //       it's true when user gets entered channel page or switches to another channel
      const chatRoomID = this.renderingChatRoomId
      if (!this.checkEventSourceConsistency(chatRoomID)) return

      const limit = this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE
      /***
       * if the removed message was the first unread messages(currentChatRoomReadUntil)
       * we can load message of that hash(messageHash) but not scroll
       * because it doesn't exist in this.messages
       * So in this case, we will load messages until the first unread mention
       * and scroll to that message
       */
      const readUntilPosition = this.currentChatRoomReadUntil?.messageHash
      // NOTE: mhash is a query for scrolling to a particular message
      //       when chat-room is done with the initial render.
      //       (refer to 'copyMessageLink' method in MessageBase.vue)
      const { mhash } = this.$route.query
      const messageHashToScroll = mhash || this.currentChatRoomScrollPosition || readUntilPosition
      let events = []
      if (!this.ephemeral.messagesInitiated) {
        const shouldLoadMoreEvents = messageHashToScroll && this.messages.findIndex(msg => msg.hash === messageHashToScroll) < 0
        if (shouldLoadMoreEvents) {
          const { height: latestHeight } = await sbp('chelonia/out/latestHEADInfo', chatRoomID)
          if (!this.checkEventSourceConsistency(chatRoomID)) return
          events = await collectEventStream(sbp('chelonia/out/eventsBetween', chatRoomID, messageHashToScroll, latestHeight, limit))
        }
      } else if (this.latestEvents.length) {
        const beforeHeight = GIMessage.deserializeHEAD(this.latestEvents[0]).head.height
        events = await collectEventStream(sbp('chelonia/out/eventsBefore', chatRoomID, Math.max(0, beforeHeight - 1), limit))
      } else {
        let sinceHeight = 0
        const { height: latestHeight } = await sbp('chelonia/out/latestHEADInfo', chatRoomID)
        if (this.messages.length) {
          sinceHeight = Math.max(0, this.messages[0].height - limit)
        }
        events = await collectEventStream(sbp('chelonia/out/eventsAfter', chatRoomID, sinceHeight, latestHeight - sinceHeight + 1))
      }

      if (!this.checkEventSourceConsistency(chatRoomID)) return

      if (events.length) {
        await this.rerenderEvents(events)
      }

      if (!this.ephemeral.messagesInitiated) {
        this.setStartNewMessageIndex()

        // NOTE: we do want the 'c-focused' animation if there is a message-scroll query.
        if (events.length) {
          // NOTE: if 'messageHashToScroll' was not there in the messages of the contract state
          //       we need to retrieve more events, and render to scroll to that message
          this.updateScroll(messageHashToScroll, Boolean(mhash))
        } else {
          // NOTE: we need to scroll to the message first in order to no more infiniteHandler is called
          await this.updateScroll(messageHashToScroll, Boolean(mhash))

          if (mhash) {
            // NOTE: delete mhash in the query after scroll and highlight the message with mhash
            const newQuery = { ...this.$route.query }
            delete newQuery.mhash
            this.$router.replace({ query: newQuery })
          }
        }
      }

      return events.length > 0 && GIMessage.deserializeHEAD(events[0]).head.height === 0
    },
    async rerenderEvents (events) {
      if (!this.latestEvents.length) {
        this.latestEvents = events
      } else if (events.length > 1) {
        this.latestEvents.unshift(...events)
      }

      const contractID = this.summary.chatRoomID
      if (!this.checkEventSourceConsistency(contractID)) return

      if (this.latestEvents.length > 0) {
        const entryHeight = GIMessage.deserializeHEAD(this.latestEvents[0]).head.height
        let state = this.generateNewChatRoomState(true, entryHeight)

        for (const event of this.latestEvents) {
          state = await sbp('chelonia/in/processMessage', event, state)
        }
        if (!this.checkEventSourceConsistency(contractID)) return
        Vue.set(this.messageState, 'contract', state)
      }
    },
    setInitMessages () {
      if (this.renderingChatRoomId === this.currentChatRoomId) {
        return
      }
      // NOTE: since the state is initialized based on the renderingChatRoomId
      //       need to set renderingChatRoomId here, before calling initializeState
      this.renderingChatRoomId = this.currentChatRoomId
      this.initializeState()
      this.ephemeral.messagesInitiated = false
      this.ephemeral.unprocessedEvents = []
      if (this.ephemeral.infiniteLoading) {
        this.ephemeral.infiniteLoading.reset()
      }
    },
    setStartNewMessageIndex () {
      this.ephemeral.startedUnreadMessageHash = null
      if (this.currentChatRoomReadUntil) {
        const index = this.messages.findIndex(msg => msg.height > this.currentChatRoomReadUntil.createdHeight)
        if (index >= 0) {
          // NOTE: When the user switches channel before the message is not fully processed,
          //       (in other words, until this.variant(msg) === 'sent')
          //       the chatroomReadUntil position would not be saved correctly
          //       because the pending messages could not be saved in state.
          //       Considering those such cases, we shoud set 'isNew' position for the messages
          //       only whose sender is not ourselves.
          for (let i = index; i < this.messages.length; i++) {
            const message = this.messages[i]
            if (!this.isMsgSender(message.from)) {
              this.ephemeral.startedUnreadMessageHash = message.hash
              break
            }
          }
        }
      }
    },
    updateReadUntilMessageHash ({ messageHash, createdHeight }) {
      const chatRoomID = this.renderingChatRoomId
      if (chatRoomID && this.isJoinedChatRoom(chatRoomID)) {
        if (this.currentChatRoomReadUntil?.createdHeight >= createdHeight) {
          // NOTE: skip adding useless invocations in KV_QUEUE queue
          return
        }
        sbp('gi.actions/identity/kv/setChatRoomReadUntil', {
          contractID: chatRoomID, messageHash, createdHeight
        })
      }
    },
    listenChatRoomActions (contractID: string, message?: GIMessage) {
      // We must check this.summary.chatRoomID and not this.currentChatRoomId
      // because they might be different, as this.summary is computed from
      // this.currentChatRoomId.
      // The watch below will ensure that this.messageState.contract is correct
      // for the current contract, which is needed for signature verification
      // when calling processMessage.
      // The watch is setup for this.summary and not for this.currentChatRoomId,
      // which is why this check must also check for this.summary.chatRoomID
      if (!this.checkEventSourceConsistency(contractID)) return

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
          const allowedActionType = [GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_ACTION_UNENCRYPTED]
          const getAllowedMessageAction = (opType, opValue) => {
            if (opType === GIMessage.OP_ATOMIC) {
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

        // This ensures that `this.latestEvents.push(serializedMessage)` below
        // happens in order
        sbp('okTurtles.eventQueue/queueEvent', CHATROOM_EVENTS, async () => {
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

              // NOTE: waiting for the animation to be completed with the duration of 500ms
              //       .c-disappeared class is defined in MessageBase.vue
              await delay(500)
            }
          }

          const serializedMessage = message.serialize()
          const newContractState = await sbp('chelonia/in/processMessage', serializedMessage, this.messageState.contract)

          if (!this.checkEventSourceConsistency(contractID)) return
          Vue.set(this.messageState, 'contract', newContractState)

          this.latestEvents.push(serializedMessage)

          if (this.ephemeral.scrolledDistance < 50) {
            if (addedOrDeleted === 'ADDED' && this.messages.length) {
              const isScrollable = this.$refs.conversation &&
                this.$refs.conversation.scrollHeight !== this.$refs.conversation.clientHeight
              const fromOurselves = this.isMsgSender(this.messages[this.messages.length - 1].from)
              if (!fromOurselves && isScrollable) {
                this.updateScroll()
              } else {
                // If there are any temporary messages that do not exist in the
                // contract, they should not be used for updateReadUntilMessageHash
                const msg = this.messages.filter(m => !m.pending && !m.hasFailed).pop()
                if (msg) {
                  this.updateReadUntilMessageHash({
                    messageHash: msg.hash,
                    createdHeight: msg.height
                  })
                }
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
      const chatRoomID = this.currentChatRoomId
      sbp('okTurtles.eventQueue/queueEvent', CHATROOM_EVENTS, async () => {
        // NOTE: invocations in CHATROOM_EVENTS queue should run in synchronous
        if (!this.checkEventSourceConsistency(chatRoomID)) return

        try {
          const completed = await this.renderMoreMessages()
          if (!this.checkEventSourceConsistency(chatRoomID)) return

          if (completed === true) {
            $state.complete()
            if (!this.$refs.conversation ||
            this.$refs.conversation.scrollHeight === this.$refs.conversation.clientHeight) {
              // updateReadUntilMessageHash should only use messages that exist
              // in the contract
              const msg = this.messages.filter(m => !m.pending && !m.hasFailed).pop()
              if (msg) {
                this.updateReadUntilMessageHash({
                  messageHash: msg.hash,
                  createdHeight: msg.height
                })
              }
            }
          } else if (completed === false) {
            $state.loaded()
          }
          if (completed !== undefined && !this.ephemeral.messagesInitiated) {
          // NOTE: 'this.ephemeral.messagesInitiated' can be set true only when renderMoreMessages are successfully proceeded
            this.ephemeral.messagesInitiated = true
          }
        } catch (e) {
          console.error('ChatMain infiniteHandler() error:', e)
        }
      })
    },
    onChatScroll () {
      // NOTE: We need this method wrapper to avoid ephemeral.onChatScroll being null
      this.ephemeral.onChatScroll?.()
    },
    // This debounced method is debounced precisely while switching groups
    // to avoid unnecessary re-rendering, and therefore is fine as is and
    // doesn't need to be flushed
    refreshContent: debounce(function () {
      // NOTE: using debounce we can skip unnecessary rendering contents
      this.setInitMessages()
    }, 250),
    // Handlers for file-upload via drag & drop action
    dragStartHandler (e) {
      e.preventDefault()
      // handler function for 'dragstart', 'dragover' events.

      if (!this.dndState.isActive) {
        this.dndState.isActive = true
      }

      // give user a correct feedback about what happens upon 'drop' action. (https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
      e.dataTransfer.dropEffect = 'copy'
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
      const toChatRoomId = to.chatRoomID
      const fromChatRoomId = from.chatRoomID
      const toIsJoined = to.isJoined
      const fromIsJoined = from.isJoined

      const initAfterSynced = (toChatRoomId) => {
        if (toChatRoomId !== this.summary.chatRoomID || this.ephemeral.messagesInitiated) return
        this.setInitMessages()
      }

      if (toChatRoomId !== fromChatRoomId) {
        this.initializeState(true)
        this.ephemeral.messagesInitiated = false
        this.ephemeral.scrolledDistance = 0
        if (sbp('chelonia/contract/isSyncing', toChatRoomId)) {
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
