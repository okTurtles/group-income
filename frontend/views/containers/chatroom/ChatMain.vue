<template lang='pug'>
.c-chat-main(v-if='summary.title')
  emoticons
  .c-body(:style='bodyStyles')
    .c-body-loading(v-if='details.isLoading')
      loading
        //
          TODO later - Design a cool skeleton loading
          - this should be done only after knowing exactly how server gets each conversation data

    .c-body-conversation(ref='conversation' v-else='' data-test='conversationWapper')

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
            :name='summary.title'
            :description='summary.description'
          )
        div(slot='no-results')
          conversation-greetings(
            :members='details.numberOfParticipants'
            :creator='summary.creator'
            :type='type'
            :name='summary.title'
            :description='summary.description'
          )

      template(v-for='(message, index) in messages')
        .c-divider(
          v-if='changeDay(index) || isNew(index)'
          :class='{"is-new": isNew(index)}'
          :key='`date-${index}`'
        )
          span(v-if='changeDay(index)') {{proximityDate(message.datetime)}}
          i18n.c-new(v-if='isNew(index)' :class='{"is-new-date": changeDay(index)}') New

        component(
          :is='messageType(message)'
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
          @scroll-to-replying-message='scrollToMessage(message.replying.id)'
          @edit-message='(newMessage) => editMessage(message, newMessage)'
          @delete-message='deleteMessage(message)'
          @add-emoticon='addEmoticon(message, $event)'
        )

  .c-footer
    send-area(
      v-if='summary.joined'
      :title='summary.title'
      @send='handleSendMessage'
      @height-update='updateSendAreaHeight'
      @start-typing='updateScroll'
      :loading='details.isLoading'
      :replying-message='ephemeral.replyingMessage'
      :replying-message-id='ephemeral.replyingMessageId'
      :replying-to='ephemeral.replyingTo'
      @stop-replying='stopReplying'
    )
    view-area(
      v-else
      :title='summary.title'
    )
</template>

<script>
import sbp from '@sbp/sbp'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
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
import { MESSAGE_TYPES, MESSAGE_VARIANTS, CHATROOM_ACTIONS_PER_PAGE } from '@model/contracts/constants.js'
import { createMessage, findMessageIdx } from '@model/contracts/chatroom.js'
import { proximityDate, MINS_MILLIS } from '@utils/time.js'
import { cloneDeep } from '@utils/giLodash.js'
import { CHATROOM_MESSAGE_ACTION } from '~/frontend/utils/events.js'
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
        bodyPaddingBottom: '',
        infiniteLoading: null,
        refreshMessages: true,
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
      'isJoinedChatRoom'
    ]),
    bodyStyles () {
      // Not sure what `bodyPaddingBottom` means, I delete it now
      // const phoneStyles = this.config.isPhone ? { paddingBottom: this.ephemeral.bodyPaddingBottom } : {}
      const phoneStyles = {}
      const unjoinedStyles =
        this.summary.joined
          ? {}
          : { height: !this.config.isPhone ? 'calc(var(--vh, 1vh) * 100 - 18rem)' : 'calc(var(--vh, 1vh) * 100 - 16rem)' }
      return { ...phoneStyles, ...unjoinedStyles }
    },
    startedUnreadIndex () {
      return this.messages.findIndex(message => message.unread === true)
    },
    currentUserAttr () {
      return {
        ...this.currentIdentityState.attributes,
        id: this.ourIdentityContractId
      }
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
      return message.replying ? message.replying.text : ''
    },
    time (strTime) {
      return new Date(strTime)
    },
    avatar (from) {
      if (from === MESSAGE_TYPES.NOTIFICATION || from === MESSAGE_TYPES.INTERACTIVE) {
        return this.currentUserAttr.picture
      }
      return this.details.participants[from].picture
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
    updateSendAreaHeight (height) {
      this.ephemeral.bodyPaddingBottom = height
    },
    stopReplying () {
      this.ephemeral.replyingMessage = null
      this.ephemeral.replyingMessageId = null
      this.ephemeral.replyingTo = null
    },
    handleSendMessage (message) {
      const replying = this.ephemeral.replyingMessageId
        ? { id: this.ephemeral.replyingMessageId, text: this.ephemeral.replyingMessage }
        : null
      // Consider only simple TEXT now
      // TODO: implement other types of messages later
      const data = { type: MESSAGE_TYPES.TEXT, text: message }

      sbp('gi.actions/chatroom/addMessage', {
        contractID: this.currentChatRoomId,
        data: !replying ? data : { ...data, replying },
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
          }
        }
      })
      // need to scroll to the bottom
      this.updateScroll()
    },
    async scrollToMessage (messageId) {
      if (!messageId) {
        return
      }

      const scrollAndHighlight = (index) => {
        const eleMessage = document.querySelectorAll('.c-body-conversation > .c-message')[index]
        eleMessage.scrollIntoView({ behavior: 'smooth' })
        eleMessage.classList.add('c-focused')
        setTimeout(() => {
          eleMessage.classList.remove('c-focused')
        }, 1500)
      }

      const msgIndex = findMessageIdx(messageId, this.messages)
      if (msgIndex >= 0) {
        scrollAndHighlight(msgIndex)
      } else {
        //  TODO: retrieve pages of events until the page contains messageId
        const events = await sbp('chelonia/private/out/eventsSince', this.currentChatRoomId, messageId)
        if (events && events.length) {
          await this.rerenderEvents(events, true)

          const msgIndex = findMessageIdx(messageId, this.messages)
          if (msgIndex >= 0) {
            scrollAndHighlight(msgIndex)
          }
        }
      }
    },
    updateScroll () {
      if (this.summary.title) {
        // force conversation viewport to be at the bottom (most recent messages)
        setTimeout(() => {
          this.$refs.conversation && this.$refs.conversation.scroll(0, this.$refs.conversation.scrollHeight)
        }, 500)
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
        data: { id: message.id, text: newMessage },
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
    isNew (index) {
      return this.startedUnreadIndex === index
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
    async getLatestEvents (refresh = false) {
      const limit = this.chatRoomSettings?.actionsPerPage || CHATROOM_ACTIONS_PER_PAGE
      const before = refresh || !this.latestEvents.length
        ? await sbp('chelonia/out/latestHash', this.currentChatRoomId)
        : GIMessage.deserialize(this.latestEvents[0]).hash()
      const events = await sbp('chelonia/out/eventsBefore', before, limit)

      await this.rerenderEvents(events, refresh)

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
      this.refreshMessages = true
      this.messages = []
      if (this.ephemeral.infiniteLoading) {
        this.ephemeral.infiniteLoading.reset()
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
    listenChatRoomActions ({ hash }) {
      sbp('okTurtles.events/once', hash, async (contractID, message) => {
        const state = this.getSimulatedState(false)
        await sbp('chelonia/private/in/processMessage', message, state)
        this.latestEvents.push(message.serialize())

        this.$forceUpdate()
      })
    },
    resizeEventHandler () {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    },
    infiniteHandler ($state) {
      this.ephemeral.infiniteLoading = $state
      this.getLatestEvents(this.refreshMessages).then(completed => {
        completed ? $state.complete() : $state.loaded()
        this.refreshMessages = false
      })
    }
  },
  watch: {
    currentChatRoomId (to, from) {
      const force = sbp('okTurtles.data/get', 'JOINING_CHATROOM')
      this.setMessageEventListener({ from, to, force })
      this.setInitMessages()
      // need to scroll to the saved position
      this.$nextTick(() => this.updateScroll())
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
  height: calc(var(--vh, 1vh) * 100 - 14rem);
  width: calc(100% + 1rem);
  position: relative;

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
  padding: 2rem 0;
  overflow-y: scroll;
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
