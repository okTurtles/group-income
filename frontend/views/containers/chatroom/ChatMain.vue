<template lang='pug'>
.c-chat-main(
  v-if='ephemeral.renderingChatRoomId'
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
            :dm-to-myself='summary.isDMToMySelf'
            :name='summary.title'
            :description='summary.attributes.description'
          )
        div(slot='no-results')
          conversation-greetings(
            :members='summary.numberOfMembers'
            :creatorID='summary.attributes.creatorID'
            :type='summary.attributes.type'
            :joined='summary.isJoined'
            :dm-to-myself='summary.isDMToMySelf'
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
          :updatedDate='message.updatedDate'
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
  portal-target(name='chat-overlay-target' class='chat-overlay-target')
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { SPMessage } from '@chelonia/lib/SPMessage'
import { L, LError } from '@common/common.js'
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
import {
  MESSAGE_TYPES, MESSAGE_VARIANTS,
  CHATROOM_ACTIONS_PER_PAGE,
  CHATROOM_MEMBER_MENTION_SPECIAL_CHAR,
  CHATROOM_REPLYING_MESSAGE_LIMITS_IN_CHARS
} from '@model/contracts/shared/constants.js'
import { CHATROOM_EVENTS, NEW_CHATROOM_UNREAD_POSITION, DELETE_ATTACHMENT_FEEDBACK } from '@utils/events.js'
import { findMessageIdx } from '@model/contracts/shared/functions.js'
import { proximityDate, MINS_MILLIS } from '@model/contracts/shared/time.js'
import { cloneDeep, debounce, throttle, delay } from 'turtledash'
import { EVENT_HANDLED } from '@chelonia/lib/events'
import { compressImage } from '@utils/image.js'
import { swapMentionIDForDisplayname, makeMentionFromUserID } from '@model/chatroom/utils.js'

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
  this.ephemeral.scrollableDistance = scrollTopMax - curScrollTop

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

  if (!this.ephemeral.messagesInitiated && this.ephemeral.renderingChatRoomId) {
    return
  }

  if (this.ephemeral.scrollableDistance > ignorableScrollDistanceInPixel) {
    // Save the current scroll position per each chatroom
    for (let i = 0; i < this.messages.length - 1; i++) {
      const msg = this.messages[i]
      if (msg.pending || msg.hasFailed) continue
      const offsetTop = this.$refs[msg.hash][0].$el.offsetTop
      const scrollMarginTop = parseFloat(window.getComputedStyle(this.$refs[msg.hash][0].$el).scrollMarginTop || 0)
      if (offsetTop - scrollMarginTop > curScrollTop) {
        sbp('okTurtles.events/emit', NEW_CHATROOM_UNREAD_POSITION, {
          chatRoomID: this.ephemeral.renderingChatRoomId,
          messageHash: msg.hash
        })
        break
      }
    }
  } else if (this.currentChatRoomScrollPosition) {
    sbp('okTurtles.events/emit', NEW_CHATROOM_UNREAD_POSITION, {
      chatRoomID: this.ephemeral.renderingChatRoomId,
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
        // Below contains the message hash on which the user manually marked as unread
        messageHashToMarkUnread: null,
        scrollableDistance: 0,
        onChatScroll: null,
        infiniteLoading: null,
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
        }
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
    this.matchMediaPhone = window.matchMedia('screen and (max-width: 768px)')
    this.matchMediaPhone.onchange = (e) => {
      this.config.isPhone = e.matches
    }
    this.config.isPhone = this.matchMediaPhone.matches
  },
  mounted () {
    // setup various event listeners.
    this.ephemeral.onChatScroll = debounce(onChatScroll.bind(this), 300)
    sbp('okTurtles.events/on', EVENT_HANDLED, this.listenChatRoomActions)
    window.addEventListener('resize', this.resizeEventHandler)

    if (this.summary.chatRoomID) {
      this.ephemeral.chatroomIdToSwitchTo = this.summary.chatRoomID
      this.processChatroomSwitch()
    }
  },
  beforeDestroy () {
    // Destroy various event listeners.
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
      if (!this.ephemeral.scrollableDistance) {
        return false
      }
      return this.ephemeral.scrollableDistance > ignorableScrollDistanceInPixel
    },
    messages () {
      return this.messageState.contract?.messages || []
    },
    isGroupCreator () {
      if (!this.isGroupDirectMessage(this.ephemeral.renderingChatRoomId)) {
        return this.currentUserAttr.id === this.currentGroupOwnerID
      }
      return false
    }
  },
  methods: {
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
      const contractID = this.ephemeral.renderingChatRoomId

      const data = { type: MESSAGE_TYPES.TEXT, text }
      if (replyingMessage) {
        data.replyingMessage = replyingMessage
      }

      const sendMessage = (beforePrePublish) => {
        let pendingMessageHash = null
        const beforeRequest = (message, oldMessage) => {
          if (this.chatroomHasSwitchedFrom(contractID)) return
          sbp('okTurtles.eventQueue/queueEvent', CHATROOM_EVENTS, async () => {
            if (this.chatroomHasSwitchedFrom(contractID)) return

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
              // NOTE: this preSendCheck does nothing except appending a pending message
              //       temporarily until the uploading attachments is finished
              //       it always returns false, so it doesn't affect the contract state
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
            // NOTE: remove temporary message which is created before uploading attachments
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
      if (!messageHash || !this.messages.length) {
        return
      }

      const scrollAndHighlight = (index) => {
        const allMessageEls = document.querySelectorAll('.c-body-conversation > .c-message')
        const eleMessage = allMessageEls[index]
        const targetIsLatestMessage = index === (allMessageEls.length - 1)
        const eleTarget = targetIsLatestMessage ? eleMessage : allMessageEls[Math.max(0, index - 1)]

        if (!eleTarget) { return }

        if (effect) {
          eleTarget.scrollIntoView({ behavior: this.isReducedMotionMode ? 'instant' : 'smooth' })
          eleMessage.classList.add('c-focused')
          setTimeout(() => {
            eleMessage.classList.remove('c-focused')
          }, 1500)
        } else {
          if (targetIsLatestMessage) {
            this.jumpToLatest('instant')
          } else {
            eleTarget.scrollIntoView()
          }
        }
      }

      const msgIndex = findMessageIdx(messageHash, this.messages)
      if (msgIndex >= 0) {
        scrollAndHighlight(msgIndex)
      } else {
        const contractID = this.ephemeral.renderingChatRoomId
        const limit = this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE
        const events =
          // FIX: this.messages[0].height could not be the starting height of the events in the page
          await sbp('chelonia/out/eventsBetween', contractID, { startHash: messageHash, endHeight: this.messages[0].height, offset: limit / 2, stream: false })
            .catch((e) => {
              console.debug(`Error fetching events or message ${messageHash} doesn't belong to ${contractID}`, e)
            })

        if (this.chatroomHasSwitchedFrom(contractID)) return
        if (events && events.length) {
          await this.rerenderEvents(events)

          if (this.chatroomHasSwitchedFrom(contractID)) return
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
      if (this.$refs.conversation) {
        this.$refs.conversation.scroll({
          left: 0,
          top: this.$refs.conversation.scrollHeight,
          // NOTE-1: Force 'instant' behaviour in reduced-motion mode regardless of the passed param.
          // NOTE-2: Browsers suspend DOM animation when the tab is inactive. Passing 'smooth' option for an inactive browser window
          //         leads to the scroll() action being ignored. So we need to explicitly pass 'instant' option in this case.
          behavior: this.isReducedMotionMode || document.hidden
            ? 'instant'
            : behavior
        })
      }
    },
    retryMessage (index) {
      const message = cloneDeep(this.messages[index])
      this.messages.splice(index, 1)
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

      const lastMsg = this.messages[this.messages.length - 1]
      const secondLastMsg = this.messages[this.messages.length - 2]
      const isDeletingLastMsg = msgHash === lastMsg?.hash

      const question = message.attachments?.length
        ? L('Are you sure you want to delete this message and it\'s file attachments permanently?')
        : L('Are you sure you want to delete this message permanently?')

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
    async initializeState (forceClearMessages = false) {
      // NOTE: this state is rendered using the chatroom contract functions
      //       so should be CAREFUL of updating the fields
      const chatRoomID = this.ephemeral.renderingChatRoomId
      const messageState = await this.generateNewChatRoomState(forceClearMessages)

      // If user has since switched to another chatroom, no need to update 'this.messageState'
      if (this.chatroomHasSwitchedFrom(chatRoomID)) return

      this.latestEvents = []
      Vue.set(this.messageState, 'contract', messageState)
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
      this.latestEvents = []
      Vue.set(this.messageState, 'contract', messageState)
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
      // NOTE: 'this.ephemeral.renderingChatRoomId' can be changed while running this function
      //       we save it in the contant variable 'chatRoomID'
      //       'this.ephemeral.messagesInitiated' describes if the messages should be fully removed and re-rendered
      //       it's true when user gets entered channel page or switches to another channel
      const chatRoomID = this.ephemeral.renderingChatRoomId
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

          if (this.chatroomHasSwitchedFrom(chatRoomID)) return
          events = await sbp('chelonia/out/eventsBetween', chatRoomID, { startHash: messageHashToScroll, endHeight: latestHeight, offset: limit, stream: false })
        }
      } else if (this.latestEvents.length) {
        const beforeHeight = SPMessage.deserializeHEAD(this.latestEvents[0]).head.height
        events = await sbp('chelonia/out/eventsBefore', chatRoomID, { beforeHeight: Math.max(0, beforeHeight - 1), limit, stream: false })
      } else {
        let sinceHeight = 0
        const { height: latestHeight } = await sbp('chelonia/out/latestHEADInfo', chatRoomID)
        if (this.messages.length) {
          sinceHeight = Math.max(0, this.messages[0].height - limit)
        }

        events = await sbp('chelonia/out/eventsAfter', chatRoomID, { sinceHeight, limit: latestHeight - sinceHeight + 1, stream: false })
        if (this.chatroomHasSwitchedFrom(chatRoomID)) return
      }

      if (events.length) {
        await this.rerenderEvents(events)
      }

      if (!this.ephemeral.messagesInitiated) {
        this.setStartNewMessageIndex()
        this.ephemeral.initialScroll.hash = messageHashToScroll
      }

      return events.length > 0 && SPMessage.deserializeHEAD(events[0]).head.height === 0
    },
    async rerenderEvents (events) {
      if (!this.latestEvents.length) {
        this.latestEvents = events
      } else if (events.length > 1) {
        this.latestEvents.unshift(...events)
      }

      if (this.latestEvents.length > 0) {
        const entryHeight = SPMessage.deserializeHEAD(this.latestEvents[0]).head.height
        let state = await this.generateNewChatRoomState(true, entryHeight)

        const chatroomID = this.ephemeral.renderingChatRoomId
        for (const event of this.latestEvents) {
          // This for block is potentially time-consuming, so if the chatroom has switched, avoid unnecessary processing.
          if (this.chatroomHasSwitchedFrom(chatroomID)) return
          state = await sbp('chelonia/in/processMessage', event, state)
        }

        Vue.set(this.messageState, 'contract', state)
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
          this.ephemeral.initialScroll.hash = null
        })
      }
    },
    setStartNewMessageIndex () {
      this.ephemeral.startedUnreadMessageHash = null
      if (this.currentChatRoomReadUntil) {
        const index = this.messages.findIndex(msg => msg.height > this.currentChatRoomReadUntil.createdHeight)

        if (index >= 0) {
          this.ephemeral.startedUnreadMessageHash = this.messages[index].hash
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

      const index = this.messages.findIndex(msg => msg.hash === messageHash)
      const isFirstMessage = index === 0
      const targetMsg = isFirstMessage ? this.messages[index] : this.messages[index - 1]

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

        return this.messages.slice(index)
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
        const foundIndex = this.messages.findIndex(msg => msg.height > this.currentChatRoomReadUntil.createdHeight)

        if (foundIndex >= 0) {
          this.ephemeral.startedUnreadMessageHash = this.messages[foundIndex].hash
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

        // This ensures that `this.latestEvents.push(serializedMessage)` below
        // happens in order
        sbp('okTurtles.eventQueue/queueEvent', CHATROOM_EVENTS, async () => {
          if (this.chatroomHasSwitchedFrom(contractID)) return

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
          Vue.set(this.messageState, 'contract', newContractState)

          this.latestEvents.push(serializedMessage)

          // When the current scroll position is nearly at the bottom and a new message is added, auto-scroll to the bottom.
          if (this.ephemeral.scrollableDistance < 50) {
            if (addedOrDeleted === 'ADDED' && this.messages.length) {
              const isScrollable = this.$refs.conversation &&
                this.$refs.conversation.scrollHeight !== this.$refs.conversation.clientHeight
              if (isScrollable) {
                // Scroll-query to the latest message.
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
        })
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
    infiniteHandler ($state) {
      // NOTE: this infinite handler is being called once which should be ignored
      //       before calling the 'initializeState' function
      this.ephemeral.infiniteLoading = $state

      if (this.ephemeral.messagesInitiated === undefined) return

      if (this.ephemeral.initialScroll.hash) {
        clearTimeout(this.ephemeral.initialScroll.timeoutId)
      }

      const targetChatroomID = this.ephemeral.renderingChatRoomId
      sbp('okTurtles.eventQueue/queueEvent', CHATROOM_EVENTS, async () => {
        if (this.chatroomHasSwitchedFrom(targetChatroomID)) return

        // NOTE: invocations in CHATROOM_EVENTS queue should run in synchronous
        try {
          const completed = await this.renderMoreMessages()
          if (this.chatroomHasSwitchedFrom(targetChatroomID)) return

          if (completed === true) {
            // If there's messages, call $state.loaded. This has the effect that
            // the no-more message will be shown instead of the no-results message
            if (this.messages.length) $state.loaded()
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

        if (this.ephemeral.messagesInitiated) {
          // Sometimes even after 'messagesInitiated' is set to 'true', infiniteHandler() is called again and loads more messages.
          // In that case, we should defer 'auto-scrolling to the initial-position' until those additional messages are rendered.
          // This can be achieved by calling 'scrollToInitialPosition' here with setTimeout(),
          // and calling clearTimeout() at the start of infiniteHandler().
          this.ephemeral.initialScroll.timeoutId = setTimeout(this.scrollToInitialPosition, 150)
        }
      })
    },
    onChatScroll () {
      // NOTE: We need this method wrapper to avoid ephemeral.onChatScroll being null
      this.ephemeral.onChatScroll?.()
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
            this.$refs.sendArea.fileAttachmentHandler(detectedFiles, true)
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
        } else {
          this.ephemeral.messagesInitiated = false
          this.ephemeral.unprocessedEvents = []
          // We need to reset the infinite loading widget. There used to be:
          // // this.ephemeral.infiniteLoading?.reset()
          // However, this doesn't quite work for two reasons:
          //   1. `this.ephemeral.infiniteLoading` is only defined after the
          //      infinite handler has been called at least once, meaning that
          //      some calls would be missed
          //   2. Even if defined, `reset` only invokes the infinite handler
          //      based on the current scroll position. In this case, we want a
          //      full reset, regardless of position. The scroll position check
          //      has been observed causing issues on Android, see
          //      <https://github.com/okTurtles/group-income/issues/2822>
          // <https://github.com/PeachScript/vue-infinite-loading/issues/303>
          // has a snipped for doing this (since the API otherwise doesn't
          // offer it): set the status and then manually emit the the infinite
          // event, which will result in the guard conditions being bypassed.
          this.$refs['infinite-loading'].status = 1 // STATUS.LOADING
          this.$refs['infinite-loading'].$emit('infinite', this.$refs['infinite-loading'].stateChanger)
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
      }
    }, 250)
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
        // Skeleton state is to render what basic information we can get synchronously.
        this.skeletonState(toChatRoomId)

        // Prevent the infinite scroll handler from rendering more messages
        this.ephemeral.messagesInitiated = undefined
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

::v-deep .chat-overlay-target {
  position: absolute;
  z-index: 1;
  bottom: 0;
  left: 0;
  width: 100%;
}
</style>
