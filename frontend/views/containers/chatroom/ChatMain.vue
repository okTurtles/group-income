<template lang='pug'>
.c-chat-main(v-if='summary.title')
  emoticons
  .c-body(:style='bodyStyles')
    .c-body-loading(v-if='details.isLoading')
      loading
        //
          TODO later - Design a cool skeleton loading
          - this should be done only after knowing exactly how server gets each conversation data

    .c-body-conversation(ref='conversation' v-else='')
      conversation-greetings(
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
          span(v-if='changeDay(index)') {{proximityDate(message.time)}}
          i18n.c-new(v-if='isNew(index)' :class='{"is-new-date": changeDay(index)}') New

        component(
          :is='messageType(message)'
          :key='messageKey(message, index)'
          :id='message.id'
          :text='message.text'
          :replyingMessage='message.replyingMessage'
          :from='message.from'
          :time='message.time'
          :emoticonsList='message.emoticons'
          :who='who(message)'
          :currentUserId='currentUserAttr.id'
          :avatar='avatar(isCurrentUser, message.from)'
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
      :title='summary.title'
      @send='handleSendMessage'
      @height-update='updateSendAreaHeight'
      @start-typing='updateScroll'
      :loading='details.isLoading'
      :replying-message='ephemeral.replyingMessage'
      :replying-to='ephemeral.replyingTo'
      @stop-replying='ephemeral.replyingMessage = null'
    )
</template>

<script>
import Avatar from '@components/Avatar.vue'
import Loading from '@components/Loading.vue'
import Message from './Message.vue'
import MessageInteractive from './MessageInteractive.vue'
import MessageNotification from './MessageNotification.vue'
import ConversationGreetings from '@containers/chatroom/ConversationGreetings.vue'
import SendArea from './SendArea.vue'
import Emoticons from './Emoticons.vue'
import { currentUserId, messageTypes, fakeEvents } from '@containers/chatroom/fakeStore.js'
import { proximityDate } from '@utils/time.js'

export default {
  name: 'ChatMain',
  components: {
    Avatar,
    Emoticons,
    Loading,
    Message,
    MessageInteractive,
    MessageNotification,
    ConversationGreetings,
    SendArea
  },
  props: {
    summary: {
      type: Object, // { type: String, title: String, description: String, routerBack: String }
      default () { return {} }
    },
    details: {
      type: Object, // { isLoading: Bool, conversation: Array, participants: Object }
      default () { return {} }
    },
    type: {
      type: String
    }
  },
  data () {
    return {
      messageTypes: messageTypes,
      config: {
        isPhone: null
      },
      ephemeral: {
        bodyPaddingBottom: '',
        conversationIsLoading: false,
        pendingMessages: [],
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
  updated () {
    this.updateScroll()
  },
  computed: {
    messages () {
      return { ...this.details.conversation, ...this.ephemeral.pendingMessages }
    },
    messageVariants () {
      return Message.constants.variants
    },
    bodyStyles () {
      return this.config.isPhone ? { paddingBottom: this.ephemeral.bodyPaddingBottom } : {}
    },
    startedUnreadIndex () {
      return this.details.conversation.findIndex(message => message.unread === true)
    },
    currentUserAttr () {
      return {
        ...this.$store.getters.ourUserIdentityContract.attributes,
        id: currentUserId
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
        case messageTypes.NOTIFICATION:
          mt = `notification-${index}-${num}`
          break

        case messageTypes.INTERACTIVE:
          mt = `interactive-${index}-${num}`
          break
      }
      return mt
    },
    messageType (message) {
      let mt = 'message'
      switch (message.from) {
        case messageTypes.NOTIFICATION:
          mt += '-notification'
          break

        case messageTypes.INTERACTIVE:
          mt += '-interactive'
          break
      }
      return mt
    },
    isCurrentUser (fromId) {
      return this.currentUserAttr.id === fromId
    },
    who (message) {
      const fromId = message.from === messageTypes.NOTIFICATION ? fakeEvents[message.id].from : message.from
      const user = this.isCurrentUser(fromId) ? this.currentUserAttr : this.details.participants[fromId]
      if (user) {
        return user.displayName || user.username
      }
    },
    variant (message) {
      if (message.hasFailed) {
        return this.messageVariants.FAILED
      } else {
        return this.isCurrentUser(message.from) ? this.messageVariants.SENT : this.messageVariants.RECEIVED
      }
    },
    avatar (isCurrentUser, fromId) {
      return isCurrentUser ? this.currentUserAttr.picture : this.details.participants[fromId].picture
    },
    isSameSender (index) {
      if (!this.messages[index - 1]) { return false }
      return this.messages[index].from === this.messages[index - 1].from
    },

    updateSendAreaHeight (height) {
      this.ephemeral.bodyPaddingBottom = height
    },
    handleSendMessage (message, replyingMessage = false) {
      console.log('sending...')
      const index = Object.keys(this.messages).length + 1
      const newMessage = {
        from: this.currentUserAttr.id,
        time: new Date(),
        text: message
      }
      if (replyingMessage) newMessage.replyingMessage = replyingMessage
      this.$set(this.ephemeral.pendingMessages, index, newMessage)

      this.sendMessage(index)
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
      this.$set(this.ephemeral.pendingMessages[index], 'hasFailed', false)

      this.sendMessage(index)
      console.log('TODO $store - retry sending a message')
    },
    replyMessage (message) {
      this.ephemeral.replyingMessage = message.text
      this.ephemeral.replyingTo = this.who(message)
    },
    sendMessage (index) {
      this.ephemeral.replyingMessage = null
      this.ephemeral.replyingTo = null
      setTimeout(() => {
        console.log('TODO $store send message')
        this.$set(this.ephemeral.pendingMessages[index], 'hasFailed', true)
      }, 2000)
    },
    changeDay (index) {
      const conv = this.messages
      if (index > 0 && index <= conv.length) {
        const prev = new Date(conv[index - 1].time)
        const current = new Date(conv[index].time)
        return prev.getDay() !== current.getDay()
      } else return false
    },
    isNew (index) {
      return this.startedUnreadIndex === index
    },
    addEmoticon (index, emoticon) {
      // Todo replace with  deep merge
      const userId = this.currentUserAttr.id
      const emoticons = this.details.conversation[index].emoticons || {}
      if (emoticons[emoticon]) {
        const alreadyAdded = emoticons[emoticon].indexOf(userId)
        if (alreadyAdded >= 0) {
          emoticons[emoticon].splice(alreadyAdded, 1)
          if (emoticons[emoticon].length === 0) {
            delete this.messages[emoticon]
            if (Object.keys(emoticons).length === 0) {
              delete this.details.conversation[index].emoticons
              return false
            }
          }
        } else emoticons[emoticon].push(userId)
      } else {
        if (!emoticons[emoticon]) emoticons[emoticon] = []
        emoticons[emoticon].push(userId)
      }

      this.$set(this.details.conversation[index], 'emoticons', emoticons)
      this.$forceUpdate()
    },
    deleteMessage (index) {
      // TODO replace by store action
      this.$set(this.details.conversation[index], 'delete', true)
      setTimeout(() => {
        delete this.messages[index]
        this.$forceUpdate()
      }, 1000)
      this.$forceUpdate()
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
}

.c-body {
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  justify-content: flex-end;
  height: calc(100vh - 14rem);
  width: calc(100% + 1rem);
  position: relative;

  &:before {
    content: '';
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
    padding: .5rem;
    color: $text_1;
    font-size: $size_5;

    + .c-new {
      position: absolute;
      right: 0;
      top: -0.3rem;
    }
  }

  &:before {
    content: '';
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

    &:before {
      background-color: $primary_0;
    }
  }

  .c-new {
    font-weight: bold;
  }
}

</style>
