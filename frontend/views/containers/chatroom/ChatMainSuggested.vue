<template lang='pug'>
.c-chat-main(
  v-if='renderingChatRoomId'
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
            :members='renderingSummary.numberOfMembers'
            :creatorID='renderingSummary.attributes.creatorID'
            :type='renderingSummary.attributes.type'
            :joined='renderingSummary.isJoined'
            :dm-to-myself='renderingSummary.isDMToMySelf'
            :name='renderingSummary.title'
            :description='renderingSummary.attributes.description'
          )
        div(slot='no-results')
          conversation-greetings(
            :members='renderingSummary.numberOfMembers'
            :creatorID='renderingSummary.attributes.creatorID'
            :type='renderingSummary.attributes.type'
            :joined='renderingSummary.isJoined'
            :dm-to-myself='renderingSummary.isDMToMySelf'
            :name='renderingSummary.title'
            :description='renderingSummary.attributes.description'
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

  .c-footer
    send-area(
      ref='sendArea'
      v-if='renderingSummary.isJoined'
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
      :joined='renderingSummary.isJoined'
      :title='renderingSummary.title'
    )
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import { L } from '@common/common.js'
import Vue from 'vue'
import Avatar from '@components/Avatar.vue'
import InfiniteLoading from 'vue-infinite-loading'
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
import { MESSAGE_TYPES, MESSAGE_VARIANTS, CHATROOM_ACTIONS_PER_PAGE, CHATROOM_MEMBER_MENTION_SPECIAL_CHAR } from '@model/contracts/shared/constants.js'
import { CHATROOM_EVENTS, NEW_CHATROOM_UNREAD_POSITION, DELETE_ATTACHMENT_FEEDBACK } from '@utils/events.js'
import { findMessageIdx } from '@model/contracts/shared/functions.js'
import { proximityDate, MINS_MILLIS } from '@model/contracts/shared/time.js'
import { cloneDeep, debounce, throttle, delay } from '@model/contracts/shared/giLodash.js'
import { EVENT_HANDLED } from '~/shared/domains/chelonia/events.js'
import { compressImage } from '@utils/image.js'

const ignorableScrollDistanceInPixel = 500

const onChatScroll = function () {
  if (!this.$refs.conversation || !this.renderingSummary.isJoined) return

  const curScrollTop = this.$refs.conversation.scrollTop
  const curScrollBottom = curScrollTop + this.$refs.conversation.clientHeight
  const scrollTopMax = this.$refs.conversation.scrollHeight - this.$refs.conversation.clientHeight
  this.ephemeral.scrolledDistance = scrollTopMax - curScrollTop

  for (let i = this.messages.length - 1; i >= 0; i--) {
    const msg = this.messages[i]
    if (msg.pending || msg.hasFailed) continue
    const offsetTop = this.$refs[msg.hash][0].$el.offsetTop
    const height = this.$refs[msg.hash][0].$el.clientHeight
    if (offsetTop + height <= curScrollBottom) {
      const bottomMessageCreatedHeight = msg.height
      const latestMessageCreatedHeight = this.currentChatRoomReadUntil?.createdHeight
      if (!latestMessageCreatedHeight || latestMessageCreatedHeight <= bottomMessageCreatedHeight) {
        this.updateReadUntilMessageHash({
          messageHash: msg.hash,
          createdHeight: msg.height
        })
      }
      break
    }
  }

  if (!this.ephemeral.messagesInitiated && this.renderingChatRoomId) return

  if (this.ephemeral.scrolledDistance > ignorableScrollDistanceInPixel) {
    for (let i = 0; i < this.messages.length - 1; i++) {
      const msg = this.messages[i]
      if (msg.pending || msg.hasFailed) continue
      const offsetTop = this.$refs[msg.hash][0].$el.offsetTop
      const scrollMarginTop = parseFloat(window.getComputedStyle(this.$refs[msg.hash][0].$el).scrollMarginTop || 0)
      if (offsetTop - scrollMarginTop > curScrollTop) {
        sbp('okTurtles.events/emit', NEW_CHATROOM_UNREAD_POSITION, {
          chatRoomID: this.renderingChatRoomId,
          messageHash: msg.hash
        })
        break
      }
    }
  } else if (this.currentChatRoomScrollPosition) {
    sbp('okTurtles.events/emit', NEW_CHATROOM_UNREAD_POSITION, {
      chatRoomID: this.renderingChatRoomId,
      messageHash: null
    })
  }
}

export default {
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
      nonReactive: {},
      ephemeral: {
        startedUnreadMessageHash: null,
        scrolledDistance: 0,
        onChatScroll: null,
        infiniteLoading: null,
        messagesInitiated: undefined,
        scrollHashOnInitialLoad: null,
        replyingMessage: null,
        replyingTo: null,
        unprocessedEvents: []
      },
      messageState: {
        contract: {}
      },
      dndState: {
        isActive: false
      },
      renderingChatRoomId: null,
      renderingSummary: null,
      chatroomSwitchQueue: [],
      isProcessingSwitch: false
    }
  },
  created () {
    this.matchMediaPhone = window.matchMedia('screen and (max-width: 639px)')
    this.matchMediaPhone.onchange = (e) => {
      this.config.isPhone = e.matches
    }
    this.config.isPhone = this.matchMediaPhone.matches
  },
  mounted () {
    this.ephemeral.onChatScroll = debounce(onChatScroll.bind(this), 500)
    if (this.summary.chatRoomID) {
      this.chatroomSwitchQueue.push({ chatRoomId: this.summary.chatRoomID, summary: cloneDeep(this.summary) })
      this.processSwitchQueue()
    }
    sbp('okTurtles.events/on', EVENT_HANDLED, this.listenChatRoomActions)
    window.addEventListener('resize', this.resizeEventHandler)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', EVENT_HANDLED, this.listenChatRoomActions)
    window.removeEventListener('resize', this.resizeEventHandler)
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
      'currentChatRoomReadUntil',
      'isReducedMotionMode'
    ]),
    currentUserAttr () {
      return {
        ...this.currentIdentityState.attributes,
        id: this.ourIdentityContractId
      }
    },
    isScrolledUp () {
      if (!this.ephemeral.scrolledDistance) return false
      return this.ephemeral.scrolledDistance > ignorableScrollDistanceInPixel
    },
    messages () {
      return this.messageState.contract?.messages || []
    },
    isGroupCreator () {
      if (!this.isGroupDirectMessage(this.renderingChatRoomId)) {
        return this.currentUserAttr.id === this.currentGroupOwnerID
      }
      return false
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
    isMsgSender (from) {
      return this.currentUserAttr.id === from
    },
    who (message) {
      const user = this.isMsgSender(message.from) ? this.currentUserAttr : this.renderingSummary.participants[message.from]
      return user?.displayName || user?.username || sbp('namespace/lookupReverseCached', message.from) || message.from
    },
    variant (message) {
      if (message.hasFailed) return MESSAGE_VARIANTS.FAILED
      if (message.pending) return MESSAGE_VARIANTS.PENDING
      return this.isMsgSender(message.from) ? MESSAGE_VARIANTS.SENT : MESSAGE_VARIANTS.RECEIVED
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
      return this.renderingSummary.participants[from]?.picture
    },
    isSameSender (index) {
      if (!this.messages[index - 1]) return false
      if (this.messages[index].type !== MESSAGE_TYPES.TEXT) return false
      if (this.messages[index].type !== this.messages[index - 1].type) return false
      const timeBetween = new Date(this.messages[index].datetime).getTime() -
        new Date(this.messages[index - 1].datetime).getTime()
      if (timeBetween > MINS_MILLIS * 10) return false
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
        data.replyingMessage = replyingMessage
        if (!replyingMessage.text) {
          const msg = this.messages.find(m => (m.hash === replyingMessage.hash))
          if (msg) data.replyingMessage.text = msg.attachments[0].name
        }
      }

      const sendMessage = (beforePrePublish) => {
        let pendingMessageHash = null
        const beforeRequest = (message, oldMessage) => {
          sbp('okTurtles.eventQueue/queueEvent', CHATROOM_EVENTS, async () => {
            beforePrePublish?.()
            const msg = this.messages.find(m => (m.hash === oldMessage.hash()))
            if (!msg) {
              Vue.set(this.messageState, 'contract', await sbp('chelonia/in/processMessage', message, this.messageState.contract))
              this.stopReplying()
              this.updateScroll()
            } else {
              msg.hash = message.hash()
              msg.height = message.height()
              pendingMessageHash = message.hash()
              this.onChatScroll()
            }
          })
        }
        sbp('gi.actions/chatroom/addMessage', {
          contractID,
          data,
          hooks: { beforeRequest }
        }).catch((e) => {
          if (e.cause?.name === 'ChelErrorFetchServerTimeFailed') {
            alert(L("Can't send message when offline, please connect to the Internet"))
          } else {
            const msgIndex = findMessageIdx(pendingMessageHash, this.messages)
            if (msgIndex > 0) Vue.set(this.messages[msgIndex], 'hasFailed', true)
          }
        })
      }
      const uploadAttachments = async () => {
        try {
          attachments = await this.checkAndCompressImages(attachments)
          data.attachments = await sbp('gi.actions/identity/uploadFiles', {
            attachments,
            billableContractID: contractID
          })
          return true
        } catch (e) {
          console.log('[ChatMain.vue]: something went wrong while uploading attachments ', e)
          throw e
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
              this.stopReplying()
              this.updateScroll()
              Vue.set(this.messageState, 'contract', await sbp('chelonia/in/processMessage', message, this.messageState.contract))
              temporaryMessage = this.messages.find((m) => m.hash === message.hash())
              return false
            }
          }
        }).then(async () => {
          await uploadAttachments()
          const removeTemporaryMessage = () => {
            if (temporaryMessage) {
              const msgIndex = findMessageIdx(temporaryMessage.hash, this.messages)
              this.messages.splice(msgIndex, 1)
            }
          }
          sendMessage(removeTemporaryMessage)
        }).catch((e) => {
          if (e.cause?.name === 'ChelErrorFetchServerTimeFailed') {
            alert(L("Can't send message when offline, please connect to the Internet"))
          } else {
            if (temporaryMessage) Vue.set(temporaryMessage, 'hasFailed', true)
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
          } else return attachment
        })
      )
    },
    async scrollToMessage (messageHash, effect = true) {
      if (!messageHash || !this.messages.length) return

      const scrollAndHighlight = (index) => {
        const allMessageEls = document.querySelectorAll('.c-body-conversation > .c-message')
        const eleMessage = allMessageEls[index]
        const targetIsLatestMessage = index === (allMessageEls.length - 1)
        const eleTarget = targetIsLatestMessage ? eleMessage : allMessageEls[Math.max(0, index - 1)]

        if (!eleTarget) return

        if (effect) {
          eleTarget.scrollIntoView({ behavior: this.isReducedMotionMode ? 'instant' : 'smooth' })
          eleMessage.classList.add('c-focused')
          setTimeout(() => eleMessage.classList.remove('c-focused'), 1500)
        } else {
          if (targetIsLatestMessage) this.jumpToLatest('instant')
          else eleTarget.scrollIntoView()
        }
      }

      const msgIndex = findMessageIdx(messageHash, this.messages)
      if (msgIndex >= 0) {
        scrollAndHighlight(msgIndex)
      } else {
        const contractID = this.renderingChatRoomId
        const limit = this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE
        const events = await sbp('chelonia/out/eventsBetween', contractID, messageHash, this.messages[0].height, limit / 2, { stream: false })
          .catch((e) => console.debug(`Error fetching events or message ${messageHash} doesn't belong to ${contractID}`, e))
        if (events && events.length) {
          await this.rerenderEvents(events)
          const msgIndex = findMessageIdx(messageHash, this.messages)
          if (msgIndex >= 0) scrollAndHighlight(msgIndex)
          else console.debug(`Message ${messageHash} is removed from ${contractID}`)
        }
      }
    },
    updateScroll (scrollTargetMessage = null, effect = false) {
      const contractID = this.renderingChatRoomId
      if (contractID) {
        return new Promise((resolve) => {
          setTimeout(async () => {
            if (scrollTargetMessage) await this.scrollToMessage(scrollTargetMessage, effect)
            else this.jumpToLatest()
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
          behavior: this.isReducedMotionMode ? 'instant' : behavior
        })
      }
    },
    retryMessage (index) {
      const message = cloneDeep(this.messages[index])
      this.messages.splice(index, 1)
      this.handleSendMessage(message.text, message.attachments, message.replyingMessage)
    },
    replyMessage (message) {
      const { text, hash, type } = message
      if (type === MESSAGE_TYPES.INTERACTIVE) {
        const proposal = message.proposal
        this.ephemeral.replyingMessage = {
          text: interactiveMessage(proposal, { from: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${proposal.creatorID}` }),
          hash
        }
        this.ephemeral.replyingTo = L('Proposal notification')
      } else {
        this.ephemeral.replyingMessage = { text, hash }
        this.ephemeral.replyingTo = this.who(message)
      }
    },
    editMessage (message, newMessage) {
      message.text = newMessage
      message.pending = true
      const contractID = this.renderingChatRoomId
      sbp('gi.actions/chatroom/editMessage', {
        contractID,
        data: { hash: message.hash, createdHeight: message.height, text: newMessage }
      }).catch((e) => console.error(`Error while editing message(${message.hash}) in chatroom(${contractID})`, e))
    },
    pinToChannel (message) {
      const contractID = this.renderingChatRoomId
      sbp('gi.actions/chatroom/pinMessage', {
        contractID,
        data: { message }
      }).catch((e) => console.error(`Error while pinning message(${message.hash}) in chatroom(${contractID})`, e))
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
        }).catch((e) => console.error(`Error while un-pinning message(${hash}) in chatroom(${contractID})`, e))
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
        }).catch((e) => console.error(`Error while deleting message(${message.hash}) for chatroom(${contractID})`, e))
      }
    },
    async deleteAttachment (message, manifestCid) {
      const contractID = this.renderingChatRoomId
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
      }).catch((e) => console.error(`Error while adding emotion for ${contractID}`, e))
    },
    async generateNewChatRoomState (shouldClearMessages = false, height) {
      const state = await sbp('chelonia/contract/state', this.renderingChatRoomId, height) || {}
      return {
        settings: state.settings || {},
        attributes: state.attributes || {},
        members: state.members || {},
        _vm: state._vm,
        messages: shouldClearMessages ? [] : state.messages,
        pinnedMessages: [],
        renderingContext: true
      }
    },
    async initializeState (forceClearMessages = false) {
      const messageState = await this.generateNewChatRoomState(forceClearMessages)
      this.latestEvents = []
      Vue.set(this.messageState, 'contract', messageState)
    },
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
      this.latestEvents = []
      Vue.set(this.messageState, 'contract', messageState)
    },
    async renderMoreMessages () {
      const chatRoomID = this.renderingChatRoomId
      const limit = this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE
      const readUntilPosition = this.currentChatRoomReadUntil?.messageHash
      const { mhash } = this.$route.query
      const messageHashToScroll = mhash || this.currentChatRoomScrollPosition || readUntilPosition
      let events = []
      if (!this.ephemeral.messagesInitiated) {
        const shouldLoadMoreEvents = messageHashToScroll && this.messages.findIndex(msg => msg.hash === messageHashToScroll) < 0
        if (shouldLoadMoreEvents) {
          const { height: latestHeight } = await sbp('chelonia/out/latestHEADInfo', chatRoomID)
          events = await sbp('chelonia/out/eventsBetween', chatRoomID, messageHashToScroll, latestHeight, limit, { stream: false })
        }
      } else if (this.latestEvents.length) {
        const beforeHeight = GIMessage.deserializeHEAD(this.latestEvents[0]).head.height
        events = await sbp('chelonia/out/eventsBefore', chatRoomID, Math.max(0, beforeHeight - 1), limit, { stream: false })
      } else {
        let sinceHeight = 0
        const { height: latestHeight } = await sbp('chelonia/out/latestHEADInfo', chatRoomID)
        if (this.messages.length) sinceHeight = Math.max(0, this.messages[0].height - limit)
        events = await sbp('chelonia/out/eventsAfter', chatRoomID, sinceHeight, latestHeight - sinceHeight + 1, undefined, { stream: false })
      }

      if (events.length) await this.rerenderEvents(events)

      if (!this.ephemeral.messagesInitiated) {
        this.setStartNewMessageIndex()
        this.ephemeral.scrollHashOnInitialLoad = messageHashToScroll
      }

      return events.length > 0 && GIMessage.deserializeHEAD(events[0]).head.height === 0
    },
    async rerenderEvents (events) {
      if (!this.latestEvents.length) {
        this.latestEvents = events
      } else if (events.length > 1) {
        this.latestEvents.unshift(...events)
      }

      if (this.latestEvents.length > 0) {
        const entryHeight = GIMessage.deserializeHEAD(this.latestEvents[0]).head.height
        let state = await this.generateNewChatRoomState(true, entryHeight)
        for (const event of this.latestEvents) {
          state = await sbp('chelonia/in/processMessage', event, state)
        }
        Vue.set(this.messageState, 'contract', state)
      }
    },
    async setInitMessages () {
      const chatRoomId = this.currentChatRoomId
      if (chatRoomId) {
        this.chatroomSwitchQueue.push({ chatRoomId, summary: cloneDeep(this.summary) })
        await this.processSwitchQueue()
      }
    },
    setStartNewMessageIndex () {
      this.ephemeral.startedUnreadMessageHash = null
      if (this.currentChatRoomReadUntil) {
        const index = this.messages.findIndex(msg => msg.height > this.currentChatRoomReadUntil.createdHeight)
        if (index >= 0) {
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
      if (chatRoomID && this.renderingSummary.isJoined) {
        if (this.currentChatRoomReadUntil?.createdHeight >= createdHeight) return
        sbp('gi.actions/identity/kv/setChatRoomReadUntil', {
          contractID: chatRoomID, messageHash, createdHeight
        }).catch(e => console.error('[ChatMain.vue] Error setting read until', e))
      }
    },
    listenChatRoomActions (contractID, message) {
      if (contractID !== this.renderingChatRoomId) return

      if (message) this.ephemeral.unprocessedEvents.push(message)

      if (!this.ephemeral.messagesInitiated) return

      this.ephemeral.unprocessedEvents.splice(0).forEach((message) => {
        const value = message.decryptedValue()
        if (!value) throw new Error('Unable to decrypt message')

        const isMessageAddedOrDeleted = (message) => {
          const allowedActionType = [GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_ACTION_UNENCRYPTED]
          const getAllowedMessageAction = (opType, opValue) => {
            if (opType === GIMessage.OP_ATOMIC) {
              const actions = opValue
                .map(([t, v]) => getAllowedMessageAction(t, v.valueOf().valueOf()))
                .filter(Boolean)
              return actions[0]
            } else if (allowedActionType.includes(opType)) {
              return opValue.action
            } else return undefined
          }

          const action = getAllowedMessageAction(message.opType(), value)
          let addedOrDeleted = 'NONE'
          if (/(addMessage|join|rename|changeDescription|leave)$/.test(action)) {
            addedOrDeleted = 'ADDED'
          } else if (/(deleteMessage)$/.test(action)) {
            addedOrDeleted = 'DELETED'
          }
          return { addedOrDeleted }
        }

        sbp('okTurtles.eventQueue/queueEvent', CHATROOM_EVENTS, async () => {
          if (contractID !== this.renderingChatRoomId) return

          if (message.direction() === 'incoming') {
            const msgIndex = findMessageIdx(message.hash(), this.messages)
            if (msgIndex !== -1 && !this.messages[msgIndex].pending) return
          }

          const { addedOrDeleted } = isMessageAddedOrDeleted(message)
          if (addedOrDeleted === 'DELETED') {
            const messageHash = value.data.hash
            const msgIndex = findMessageIdx(messageHash, this.messages)
            if (msgIndex !== -1) {
              document.querySelectorAll('.c-body-conversation > .c-message')[msgIndex]?.classList.add('c-disappeared')
              await delay(500)
            }
          }

          const serializedMessage = message.serialize()
          const newContractState = await sbp('chelonia/in/processMessage', serializedMessage, this.messageState.contract)
          Vue.set(this.messageState, 'contract', newContractState)
          this.latestEvents.push(serializedMessage)

          if (this.ephemeral.scrolledDistance < 50) {
            if (addedOrDeleted === 'ADDED' && this.messages.length) {
              const isScrollable = this.$refs.conversation &&
                this.$refs.conversation.scrollHeight !== this.$refs.conversation.clientHeight
              if (isScrollable) {
                this.updateScroll()
              } else {
                const msg = this.messages.filter(m => !m.pending && !m.hasFailed).pop()
                if (msg) this.updateReadUntilMessageHash({ messageHash: msg.hash, createdHeight: msg.height })
              }
            }
          }
        })
      })
    },
    resizeEventHandler () {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
      if (this.ephemeral.scrolledDistance < 40) this.throttledJumpToLatest(this)
    },
    throttledJumpToLatest: throttle(function (_this) {
      _this.jumpToLatest('instant')
    }, 40),
    async processSwitchQueue () {
      if (this.isProcessingSwitch || this.chatroomSwitchQueue.length === 0) return

      this.isProcessingSwitch = true
      const target = this.chatroomSwitchQueue[this.chatroomSwitchQueue.length - 1]
      this.chatroomSwitchQueue = []
      this.renderingChatRoomId = target.chatRoomId
      this.renderingSummary = target.summary
      await this.initializeState(true)
      this.ephemeral.messagesInitiated = false
      if (this.$refs['infinite-loading']) {
        this.$refs['infinite-loading'].stateChanger.reset()
        this.$refs['infinite-loading'].attemptLoad()
      }
      this.isProcessingSwitch = false
      if (this.chatroomSwitchQueue.length > 0) this.processSwitchQueue()
    },
    infiniteHandler ($state) {
      this.ephemeral.infiniteLoading = $state
      if (this.ephemeral.messagesInitiated === undefined) return
      if (this.currentChatRoomId !== this.renderingChatRoomId) return
      sbp('okTurtles.eventQueue/queueEvent', CHATROOM_EVENTS, async () => {
        try {
          const completed = await this.renderMoreMessages()
          if (completed === true) {
            if (this.messages.length) $state.loaded()
            $state.complete()
            if (!this.$refs.conversation ||
                this.$refs.conversation.scrollHeight === this.$refs.conversation.clientHeight) {
              const msg = this.messages.filter(m => !m.pending && !m.hasFailed).pop()
              if (msg) this.updateReadUntilMessageHash({ messageHash: msg.hash, createdHeight: msg.height })
            }
          } else if (completed === false) {
            $state.loaded()
          }
          if (completed !== undefined && !this.ephemeral.messagesInitiated) {
            this.ephemeral.messagesInitiated = true
            if (this.ephemeral.scrollHashOnInitialLoad) {
              const scrollingToSpecificMessage = this.$route.query?.mhash === this.ephemeral.scrollHashOnInitialLoad
              this.$nextTick(() => {
                this.updateScroll(this.ephemeral.scrollHashOnInitialLoad, scrollingToSpecificMessage)
                if (scrollingToSpecificMessage) {
                  const newQuery = { ...this.$route.query }
                  delete newQuery.mhash
                  this.$router.replace({ query: newQuery })
                }
                this.ephemeral.scrollHashOnInitialLoad = null
              })
            }
          }
        } catch (e) {
          console.error('ChatMain infiniteHandler() error:', e)
        }
      })
    },
    onChatScroll () {
      this.ephemeral.onChatScroll?.()
    },
    refreshContent: debounce(function () {
      this.setInitMessages().catch(e => console.error('[ChatMain.vue] refreshContent error', e))
    }, 250),
    dragStartHandler (e) {
      e.preventDefault()
      if (!this.dndState.isActive) this.dndState.isActive = true
      e.dataTransfer.dropEffect = 'copy'
    },
    dragEndHandler (e) {
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
    summary (to, from) {
      const toChatRoomId = to.chatRoomID
      const fromChatRoomId = from.chatRoomID
      if (toChatRoomId !== fromChatRoomId) {
        this.chatroomSwitchQueue.push({ chatRoomId: toChatRoomId, summary: cloneDeep(to) })
        this.processSwitchQueue()
      }
    }
  }
}
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
