<template lang="pug">
.c-chatmain(:class='{ isActive: summary.title }')
  template(v-if='summary.title')
    main-header(:description='summary.description' :routerback='summary.routerBack')

      template(slot='title')
        avatar.c-header-avatar(:src='summary.picture' alt='')
          i.c-header-private(:class="{\
          'icon-globe': summary.private === false,\
          'icon-lock': summary.private === true,\
          }" v-if='summary.private !== undefined')
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
            i18n.subtitle.c-divider(
              v-if='startedUnreadIndex === index'
              :key='`subtitle-${index}`'
            ) New messages

            message-notification(:key='`notification-${index}`' v-if="message.from === 'notification'")
              | {{message.text}}

            // cf: https://github.com/vuejs/eslint-plugin-vue/issues/462
            // eslint-disable-next-line vue/require-component-is
            component(
              v-else=''
              :key='`message-${index}`'
              v-bind='getMessageAt[index]'
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
import MainHeader from '../MainHeader.vue'
import Avatar from '../Avatar.vue'
import Loading from '../Loading.vue'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '../Menu/index.js'
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
    getMessageAt () {
      let isCurrentUser

      return this.details.conversation.map((message, index) => {
        isCurrentUser = this.currentUserAttr.id === message.from

        if (message.from === messageTypes.INTERACTIVE) {
          return {
            is: MessageInteractive,
            id: message.id
          }
        }
        if (message.from === messageTypes.NOTIFICATION) {
          return {
            is: MessageNotification,
            text: message.text
          }
        }

        return {
          is: Message,
          text: message.text,
          who: this.who(isCurrentUser, message.from),
          avatar: this.avatar(isCurrentUser, message.from),
          variant: this.variant(isCurrentUser),
          hideWho: this.shouldHideWho(index),
          isSameSender: this.isSameSender(index)
        }
      })
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
        ...this.$store.getters.currentUserIdentityContract.attributes,
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

      return user.displayName || user.name
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
@import "../../../assets/style/_variables.scss";

.c-chatmain {
  position: relative;
  width: 100vw;
  min-width: 0;
  min-height: 100vh;
  background-color: $body-background-color;

  .c-actions-content {
    top: $spacer-lg;
    right: 0;
    left: auto;
    width: 10rem;
  }
}

.c-header-private {
  margin-right: $spacer-xs;
}

.c-header-private,
.c-header-avatar {
  @include phablet {
    display: none;
  }
}

.c-body {
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  justify-content: flex-end;

  &-conversation {
    padding: $spacer 0;
  }
}

.c-footer {
  padding: 0 $spacer-sm $spacer;
}

.c-divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: $spacer 0;

  &::before,
  &::after {
    content: "";
    flex-grow: 1;
    border-bottom: 1px solid $tertiary;
  }

  &::before {
    margin-right: $spacer-sm;
  }

  &::after {
    margin-left: $spacer-sm;
  }
}

@include phone {
  .c-chatmain {
    /* A - MVP static way - show / hide conversation */
    display: none;
    z-index: $zindex-tooltip;

    &.isActive {
      display: block;
    }

    /* B - dynamic way
    - slideIn from right to left - more complex - needs tricky work
    - TODO - If there's time, I'll build this alternative.
    */
  }

  // NOTE: Mobile - prefer to fix the header & footer instead of using flexbox
  // So the body scroll is the mobile browser's default instead of overflow::scroll inside flexbox
  // It's much more smooth, so better for the user experience
  .c-body {
    padding-top: $spacer-xl;
    padding-bottom: 2.5rem; // initial fixed footer height
    min-height: 100vh;
  }

  .c-footer {
    position: fixed;
    left: 0;
    bottom: 0;
    width: 100vw;
    background-color: $body-background-color;
  }
}

@include phablet {
  .c-chatmain {
    width: auto;
    display: flex;
    flex-direction: column;
    flex-basis: 25rem;
    flex-grow: 1;
  }

  .c-header {
    padding: $spacer;
  }

  .c-body {
    overflow: scroll;

    &-conversation {
      position: relative;
      padding-bottom: 0;
      max-height: 100%;
      overflow: scroll;
      -webkit-overflow-scrolling: touch;
    }
  }

  .c-footer {
    position: relative;
    padding-left: $spacer;
    padding-right: $spacer;
  }
}

</style>
