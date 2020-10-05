<template lang='pug'>
.c-chat-main(v-if='summary.title')
  .c-body(:style='bodyStyles')
    .c-body-loading(v-if='details.isLoading')
      loading
        //
          TODO later - Design a cool skeleton loading
          - this should be done only after knowing exactly how server gets each conversation data

    .c-body-conversation(ref='conversation' v-else='')
      conversation-greetings(:type='type' :name='summary.title')

      template(v-for='(message, index) in details.conversation')
        .c-divider(
          v-if='changeDay(index) || isNew(index)'
          :class='{"is-new": isNew(index)}'
          :key='`date-${index}`'
        )
          span(v-if='changeDay(index)') {{proximityDate(message.time)}}
          i18n.c-new(v-if='isNew(index)' :class='{"is-new-date": changeDay(index)}') New

        component(
          :key='messageKey(message, index)'
          :id='message.id'
          :is='messageType(message)'
          :text='message.text'
          :who='who(isCurrentUser(message.from), message.from)'
          :time='message.time'
          :avatar='avatar(isCurrentUser, message.from)'
          :variant='variant(isCurrentUser(message.from))'
          :hideWho='shouldHideWho(index)'
          :isSameSender='isSameSender(index)'
        )

      message(
        v-for='(message, index) in ephemeral.pendingMessages'
        :key='`pending-messages-${index}`'
        v-bind='getPendingAt[index]'
        @retry='retryMessage(index)'
      )

  .c-footer
    send-area(:title='summary.title' @send='handleSendMessage' @heightupdate='updateSendAreaHeight' :loading='details.isLoading')
</template>

<script>
import Avatar from '@components/Avatar.vue'
import Loading from '@components/Loading.vue'
import Message from './Message.vue'
import MessageInteractive from './MessageInteractive.vue'
import MessageNotification from './MessageNotification.vue'
import ConversationGreetings from '@containers/chatroom/ConversationGreetings.vue'
import SendArea from './SendArea.vue'
import { currentUserId, messageTypes } from '@containers/chatroom/fakeStore.js'
import { proximityDate } from '@utils/time.js'

export default {
  name: 'ChatMain',
  components: {
    Avatar,
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
        pendingMessages: []
      }
    }
  },
  created () {
    // TODO #492 create a global Vue Responsive just for media queries.
    var mediaIsPhone = window.matchMedia('screen and (max-width: 639px)')
    this.config.isPhone = mediaIsPhone.matches
    mediaIsPhone.onchange = (e) => { this.config.isPhone = e.matches }
  },
  updated () {
    if (this.summary.title) {
      // force conversation viewport to be at the bottom (most recent messages)
      if (this.config.isPhone) {
        this.$nextTick(() => {
          window.scroll(0, document.body.offsetHeight)
        })
      } else {
        this.$refs.conversation && this.$refs.conversation.scroll(0, this.$refs.conversation.scrollHeight)
      }
    }
  },
  computed: {
    messageVariants () {
      return Message.constants.variants
    },
    bodyStyles () {
      return this.config.isPhone ? { paddingBottom: this.ephemeral.bodyPaddingBottom } : {}
    },
    startedUnreadIndex () {
      return this.details.conversation.findIndex(message => message.unread === true)
    },
    getPendingAt () {
      return this.ephemeral.pendingMessages.map((message, index) => ({
        text: message.text,
        who: this.who(true),
        avatar: this.avatar(true),
        variant: message.hasFailed ? this.messageVariants.FAILED : this.messageVariants.SENT,
        isSameSender: index > 0
      }))
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
      let mt = `message-${index}`
      switch (message.from) {
        case messageTypes.NOTIFICATION:
          mt = `notification-${index}`
          break

        case messageTypes.INTERACTIVE:
          mt = `interactive-${index}`
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
    shouldHideWho (index) {
      if (this.isFromGIBot(index)) { return true }
      return false
    },
    isFromGIBot (index) {
      return this.details.conversation[index].from === 'GIBot'
    },
    who (isCurrentUser, fromId) {
      const user = isCurrentUser ? this.currentUserAttr : this.details.participants[fromId]
      if (user) {
        return user.displayName || user.username
      }
    },
    variant (isCurrentUser) {
      return isCurrentUser ? this.messageVariants.SENT : this.messageVariants.RECEIVED
    },
    avatar (isCurrentUser, fromId) {
      return isCurrentUser ? this.currentUserAttr.picture : this.details.participants[fromId].picture
    },
    isSameSender (index) {
      if (!this.details.conversation[index - 1]) { return false }
      if (this.isFromGIBot(index)) { return false }
      return this.details.conversation[index].from === this.details.conversation[index - 1].from
    },

    updateSendAreaHeight (height) {
      this.ephemeral.bodyPaddingBottom = height
    },
    handleSendMessage (message) {
      console.log('sending...')
      const index = this.ephemeral.pendingMessages.length

      this.ephemeral.pendingMessages.push({
        from: this.currentUserAttr.id,
        text: message
      })

      this.sendMessage(index)
    },
    retryMessage (index) {
      this.$set(this.ephemeral.pendingMessages[index], 'hasFailed', false)

      this.sendMessage(index)
      console.log('TODO $store - retry sending a message')
    },
    sendMessage (index) {
      setTimeout(() => {
        console.log('TODO $store send message')
        this.$set(this.ephemeral.pendingMessages[index], 'hasFailed', true)
      }, 2000)
    },
    changeDay (index) {
      const conv = this.details.conversation
      if (index > 0 && index <= conv.length) {
        const prev = new Date(conv[index - 1].time)
        const current = new Date(conv[index].time)
        return prev.getDay() !== current.getDay()
      } else return false
    },
    isNew (index) {
      return this.startedUnreadIndex === index
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
}

.c-body {
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  justify-content: flex-end;
  height: calc(100vh - 14rem);
}

.c-body-conversation {
  padding: 2rem 0;

  div:nth-child(n+5) {
    display: none;
  }
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

@include tablet {
  .c-body {
    overflow: auto;
  }

  .c-body-conversation {
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }
}

</style>
