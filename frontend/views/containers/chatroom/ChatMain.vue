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
          :key='messageKey(message, index)'
          :text='message.text'
          :notification='message.notification'
          :replyingMessage='message.replyingMessage'
          :from='message.from'
          :datetime='time(message.datetime)'
          :emoticonsList='message.emoticons'
          :who='who(message)'
          :currentUserId='currentUserAttr.id'
          :avatar='avatar(message.from)'
          :variant='variant(message)'
          :isSameSender='isSameSender(index)'
          :isCurrentUser='isCurrentUser(message.from)'
          :class='{removed: message.delete}'
          @retry='retryMessage(index)'
          @reply='replyMessage(message)'
          @add-emoticon='addEmoticon(index, $event)'
          @delete-message='deleteMessage(index)'
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
      :replying-to='ephemeral.replyingTo'
      @stop-replying='ephemeral.replyingMessage = null'
    )
    view-area(
      v-else
      :title='summary.title'
    )
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import Avatar from '@components/Avatar.vue'
import Loading from '@components/Loading.vue'
import Message from './Message.vue'
import MessageInteractive from './MessageInteractive.vue'
import MessageNotification from './MessageNotification.vue'
import ConversationGreetings from '@containers/chatroom/ConversationGreetings.vue'
import SendArea from './SendArea.vue'
import ViewArea from './ViewArea.vue'
import Emoticons from './Emoticons.vue'
import { MESSAGE_TYPES, MESSAGE_ACTION_TYPES, MESSAGE_VARIANTS } from '@model/contracts/constants.js'
import { createMessage, getLatestMessages } from '@model/contracts/chatroom.js'
import { proximityDate, MINS_MILLIS } from '@utils/time.js'
import { CHATROOM_MESSAGE_ACTION, CHATROOM_STATE_LOADED } from '~/frontend/utils/events.js'
import { CONTRACT_IS_SYNCING } from '@utils/events.js'

export default ({
  name: 'ChatMain',
  components: {
    Avatar,
    Emoticons,
    Loading,
    Message,
    MessageInteractive,
    MessageNotification,
    ConversationGreetings,
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
      messages: [],
      ephemeral: {
        bodyPaddingBottom: '',
        replyingMessage: null,
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
  updated () {
    this.updateScroll()
  },
  computed: {
    ...mapGetters([
      'currentChatRoomId',
      'chatRoomSettings',
      'chatRoomLatestMessages',
      'ourIdentityContractId',
      'ourUserIdentityContract',
      'isJoinedChatRoom'
    ]),
    bodyStyles () {
      const phoneStyles = this.config.isPhone ? { paddingBottom: this.ephemeral.bodyPaddingBottom } : {}
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
        ...this.ourUserIdentityContract.attributes,
        id: this.ourIdentityContractId
      }
    }
  },
  methods: {
    proximityDate,
    messageKey (message, index) {
      let num = 0
      const emoticons = message.emoticons || {}
      Object.keys(emoticons).forEach(e => {
        num += emoticons[e].length
      })
      let mt = `message-${index}-${num}`
      switch (message.from) {
        case MESSAGE_TYPES.NOTIFICATION:
          mt = `notification-${index}-${num}`
          break

        case MESSAGE_TYPES.INTERACTIVE:
          mt = `interactive-${index}-${num}`
          break
      }
      return mt
    },
    messageType (message) {
      let mt = 'message'
      switch (message.type) {
        case MESSAGE_TYPES.NOTIFICATION:
          mt += '-notification'
          break

        case MESSAGE_TYPES.INTERACTIVE:
          mt += '-interactive'
          break
      }
      return mt
    },
    isCurrentUser (fromId) {
      return this.currentUserAttr.username === fromId
    },
    who (message) {
      const user = this.isCurrentUser(message.from) ? this.currentUserAttr : this.details.participants[message.from]
      return user.displayName || user.username || message.from
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
    time (strTime) {
      return new Date(strTime)
    },
    avatar (fromId) {
      if (fromId === MESSAGE_TYPES.NOTIFICATION || fromId === MESSAGE_TYPES.INTERACTIVE) {
        return this.currentUserAttr.picture
      }
      return this.details.participants[fromId].picture
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
    handleSendMessage (message, replyingMessage = null) {
      console.log('sending...')
      // Consider only simple TEXT now
      // TODO: implement other types of messages later
      const data = {
        type: MESSAGE_TYPES.TEXT,
        text: message
      }

      sbp('gi.actions/chatroom/addMessage', {
        contractID: this.currentChatRoomId,
        data: !replyingMessage ? data : { ...data, replyingMessage },
        hooks: {
          prepublish: (message) => {
            const msgValue = JSON.parse(message.opValue())
            const { meta, data } = msgValue
            this.messages.push({
              ...createMessage({ meta, data, hash: message.hash() }),
              pending: true
            })
          }
        }
      })
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
      this.ephemeral.replyingTo = this.who(message)
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
    addEmoticon (index, emoticon) {
      // Todo replace with  deep merge
      const userId = this.currentUserAttr.id
      const emoticons = this.messages[index].emoticons || {}
      if (emoticons[emoticon]) {
        const alreadyAdded = emoticons[emoticon].indexOf(userId)
        if (alreadyAdded >= 0) {
          emoticons[emoticon].splice(alreadyAdded, 1)
          if (emoticons[emoticon].length === 0) {
            delete this.messages[emoticon]
            if (Object.keys(emoticons).length === 0) {
              delete this.messages[index].emoticons
              return false
            }
          }
        } else emoticons[emoticon].push(userId)
      } else {
        if (!emoticons[emoticon]) emoticons[emoticon] = []
        emoticons[emoticon].push(userId)
      }

      this.$set(this.messages[index], 'emoticons', emoticons)
      this.$forceUpdate()
    },
    deleteMessage (index) {
      // TODO replace by store action
      this.$set(this.messages[index], 'delete', true)
      setTimeout(() => {
        delete this.messages[index]
        this.$forceUpdate()
      }, 1000)
      this.$forceUpdate()
    },
    setInitMessages () {
      if (this.isJoinedChatRoom(this.currentChatRoomId)) {
        this.messages = this.chatRoomLatestMessages
      } else {
        this.messages = []
        sbp('okTurtles.events/once', `${CHATROOM_STATE_LOADED}-${this.currentChatRoomId}`, (state) => {
          this.messages = getLatestMessages({
            count: this.chatRoomSettings.messagesPerPage, // TODO: this.chatRoomSettings could be {}
            messages: state.messages
          })
        })
      }
    },
    setMessageEventListener ({ force = false, from, to }) {
      if (from) {
        sbp('okTurtles.events/off', `${CHATROOM_MESSAGE_ACTION}-${from}`, this.listenChatRoomActions)
      }
      if (force) {
        sbp('okTurtles.events/on', `${CHATROOM_MESSAGE_ACTION}-${to || this.currentChatRoomId}`, this.listenChatRoomActions)
      } else {
        if (this.isJoinedChatRoom(to)) {
          sbp('okTurtles.events/on', `${CHATROOM_MESSAGE_ACTION}-${to}`, this.listenChatRoomActions)
        }
      }
    },
    listenChatRoomActions ({ type, data }) {
      const addIfNotExist = (msg) => {
        let m = null
        for (let i = this.messages.length - 1; i >= 0; i--) {
          if (this.messages[i].id === msg.id) {
            m = this.messages[i]
            break
          }
        }
        if (m) {
          delete m.pending
        } else {
          this.messages.push(msg)
        }
      }
      if (type === MESSAGE_ACTION_TYPES.ADD_MESSAGE) {
        const { message } = data
        if (message.type === MESSAGE_TYPES.TEXT) {
          if (this.isCurrentUser(message.from)) {
            addIfNotExist(message)
          } else {
            this.messages.push(message)
          }
        } else if (message.type === MESSAGE_TYPES.NOTIFICATION) {
          this.messages.push(message)
        }
      }
      this.$forceUpdate()
    },
    resizeEventHandler () {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
  },
  watch: {
    currentChatRoomId (to, from) {
      const force = sbp('okTurtles.data/get', 'JOINING_CHATROOM')
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
