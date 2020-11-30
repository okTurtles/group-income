<template lang='pug'>
.c-chat-main(v-if='summary.title')
  main-header(:description='summary.description' :router-back='summary.routerBack')

    template(slot='title')
      avatar.c-header-avatar(:src='summary.picture' alt='' size='sm')
        i.c-header-private(
          v-if='summary.private !== undefined'
          :class='{"icon-globe": summary.private === false, "icon-lock": summary.private === true}'
        )
        | {{summary.title}}

    template(slot='actions')
      button.is-icon
        i.icon-user-plus
      button.is-icon
        // TODO later - show a tooltip on notifications snooze
        i.icon-bell

      menu-parent
        menu-trigger.is-icon
          i.icon-ellipsis-v

        // TODO later - be a drawer on mobile
        menu-content.c-actions-content
          ul
            menu-item(tag='button' itemid='hash-1' icon='heart')
              i18n Option 1
            menu-item(tag='button' itemid='hash-2' icon='heart')
              i18n Option 2
            menu-item(tag='button' itemid='hash-3' icon='heart')
              i18n Option 3

  .c-body(:style='bodyStyles')
    .c-body-loading(v-if='details.isLoading')
      loading
        //
          TODO later - Design a cool skeleton loading
          - this should be done only after knowing exactly how server gets each conversation data

    .c-body-conversation(ref='conversation' v-else='')
      conversation-greetings
      template(v-for='(message, index) in details.conversation')
        i18n.is-subtitle.c-divider(
          v-if='startedUnreadIndex === index'
          :key='`subtitle-${index}`'
        ) New messages

        message-notification(
          v-if='message.from === messageTypes.NOTIFICATION'
          :key='`notification-${index}`'
        ) {{message.text}}

        message-interactive(
          v-else-if='message.from === messageTypes.INTERACTIVE'
          :key='`interactive-${index}`'
          :text='message.text'
        )

        // cf: https://github.com/vuejs/eslint-plugin-vue/issues/462
        // eslint-disable-next-line vue/require-component-is
        message(
          v-else=''
          :key='`message-${index}`'
          :text='message.text'
          :who='who(isCurrentUser(message.from), message.from)'
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
    send-area(:title='summary.title' @send='handleSendMessage' @height-update='updateSendAreaHeight' :loading='details.isLoading')
</template>

<script>
import MainHeader from './MainHeader.vue'
import Avatar from '@components/Avatar.vue'
import Loading from '@components/Loading.vue'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'
import Message from './Message.vue'
import MessageInteractive from './MessageInteractive.vue'
import MessageNotification from './MessageNotification.vue'
import ConversationGreetings from '@containers/chatroom/ConversationGreetings.vue'
import SendArea from './SendArea.vue'
import { currentUserId, messageTypes } from '@containers/chatroom/fakeStore.js'

export default {
  name: 'ChatMain',
  components: {
    MainHeader,
    Avatar,
    Loading,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem,
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
    const mediaIsPhone = window.matchMedia('screen and (max-width: 639px)')
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

      return user.displayName || user.username
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

.c-header-top .c-actions-content {
  top: 2rem;
  right: 0;
  left: auto;
  width: 10rem;
}

.c-header-private {
  margin-right: 0.25rem;
}

.c-header-private,
.c-header-avatar {
  @include tablet {
    display: none;
  }
}

.c-body {
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  justify-content: flex-end;
}

.c-body-conversation {
  padding: 1rem 0;
}

.c-divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1rem 0;

  &::before,
  &::after {
    content: "";
    flex-grow: 1;
    border-bottom: 1px solid $warning_0;
  }

  &::before {
    margin-right: 0.5rem;
  }

  &::after {
    margin-left: 0.5rem;
  }
}

@include tablet {
  .c-header {
    padding: 1rem;
  }

  .c-body {
    overflow: auto;
  }

  .c-body-conversation {
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }
}

</style>
