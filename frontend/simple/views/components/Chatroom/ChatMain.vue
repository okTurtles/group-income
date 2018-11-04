<template>
  <div class="c-chatmain" :class="{ isActive: summary.title }">
    <template v-if="summary.title">
      <chat-header
        :title="summary.title"
        :description="summary.description"
        routerBack="/messages"
      >
        <template slot="actions">
          <button class="button is-icon">
            <i class="fa fa-user-plus"></i>
          </button>
          <button class="button is-icon">
            <i class="fa fa-bell"></i>
          </button>
          <menu-parent class="level-right">
            <menu-trigger class="is-icon">
              <i class="fa fa-ellipsis-v"></i>
            </menu-trigger>

            <!-- TODO later - be a drawer on mobile -->
            <menu-content class="c-actions-content">
              <list hasMargin>
                <menu-item tag="button" itemId="hash-1" icon="heart">
                  Option 1
                </menu-item>
                <menu-item tag="button" itemId="hash-2" icon="heart">
                  Option 2
                </menu-item>
                <menu-item tag="button" itemId="hash-3" icon="heart">
                  Option 3
                </menu-item>
              </list>
            </menu-content>
          </menu-parent>
        </template>
      </chat-header>

      <div class="c-body is-flex" :style="bodyStyles">
        <div v-if="details.isLoading">
          LOADING... <!-- TODO Design a cool skeleton loading -->
        </div>
        <template v-else>
          <div class="c-body-conversation" ref="conversation">
            <conversation-greetings />
            <component
              v-for="(message, index) in details.conversation"
              v-bind="getMessageAt[index]"
            />
            <message
              v-for="(message, index) in ephemeral.pendingMessages"
              v-bind="getPendingAt[index]"
              @retry="retryMessage(index)"
            />
          </div>
        </template>
      </div>
      <div class="c-footer">
        <send-area :title="summary.title"
          @send="sendMessage"
          @heightUpdate="updateSendAreaHeight"
        />
      </div>
    </template>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-chatmain {
  position: relative;
  width: 100vw;
  min-width: 0;
  min-height: 100vh;
  background-color: $body-background-color;
  z-index: $gi-zindex-sidebar;

  .c-actions-content {
    top: $gi-spacer-lg;
    right: 0;
    left: auto;
    width: 10rem;
  }
}

.c-body {
  flex-grow: 1;
  flex-direction: column;
  justify-content: flex-end;

  &-conversation {
    padding: $gi-spacer-lg 0;
  }
}

.c-footer {
  padding: 0 $gi-spacer-sm $gi-spacer;
}

@include phone {
  .c-chatmain {
    /* A - MVP static way - show / hide conversation */
    display: none;

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
    padding-top: 4rem;
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
    padding: $gi-spacer;
  }

  .c-body {
    &-conversation {
      position: relative;
      padding-bottom: $gi-spacer;
      max-height: 100%;
      overflow: scroll;
      -webkit-overflow-scrolling: touch;
    }
  }

  .c-footer {
    position: relative;
    padding-left: $gi-spacer;
    padding-right: $gi-spacer;
  }
}

</style>
<script>
import ChatHeader from './ChatHeader.vue'
import { List } from '../Lists/index.js'
import { MenuParent, MenuTrigger, MenuContent, MenuHeader, MenuItem } from '../Menu/index.js'
import Message from './Message.vue'
import MessageInteractive from './MessageInteractive.vue'
import MessageNotification from './MessageNotification.vue'
import ConversationGreetings from '../../containers/Chatroom/ConversationGreetings.vue'
import SendArea from './SendArea.vue'
import { currentUserId } from '../../containers/Chatroom/fakeStore.js'

export default {
  name: 'ChatMain',
  components: {
    ChatHeader,
    List,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuHeader,
    MenuItem,
    Message,
    MessageInteractive,
    MessageNotification,
    ConversationGreetings,
    SendArea
  },
  props: {
    summary: {
      type: Object,
      default: {}
    },
    details: {
      type: Object,
      default: {}
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
        setTimeout(function () {
          window.scroll(0, document.body.offsetHeight)
        }, 0) // REVIEW: without timeout it scrolls before the DOM is ready... why?
      } else {
        this.$refs.conversation && this.$refs.conversation.scroll(0, this.$refs.conversation.scrollHeight)
      }
    }
  },
  computed: {
    bodyStyles () {
      return this.config.isPhone ? { paddingBottom: this.ephemeral.bodyPaddingBottom } : {}
    },
    getMessageAt () {
      let isCurrentUser

      return this.details.conversation.map((message, index) => {
        isCurrentUser = this.currentUserAttr.id === message.from

        if (message.from === 'interactive') {
          return {
            is: MessageInteractive,
            id: message.id
          }
        }
        if (message.from === 'notification') {
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
          // hideWho: this.summary.type !== 'messages',
          isSameSender: this.isSameSender(index)
        }
      })
    },
    getPendingAt () {
      return this.ephemeral.pendingMessages.map((message, index) => ({
        text: message.text,
        who: this.who(true),
        avatar: this.avatar(true),
        variant: message.hasFailed ? 'failed' : 'sent',
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
    who (isCurrentUser, fromId) {
      const user = isCurrentUser ? this.currentUserAttr : this.details.participants[fromId]

      return user.displayName || user.name
    },
    variant (isCurrentUser) {
      return isCurrentUser ? 'sent' : 'received'
    },
    avatar (isCurrentUser, fromId) {
      return isCurrentUser ? this.currentUserAttr.picture : this.details.participants[fromId].picture
    },
    isSameSender (index) {
      if (!this.details.conversation[index - 1]) { return false }
      return this.details.conversation[index].from === this.details.conversation[index - 1].from
    },

    updateSendAreaHeight (height) {
      this.ephemeral.bodyPaddingBottom = height
    },
    sendMessage (message) {
      console.log('sending...')
      const index = this.ephemeral.pendingMessages.length

      this.ephemeral.pendingMessages.push({
        from: this.currentUserAttr.id,
        text: message
      })

      setTimeout(() => {
        console.log('TODO $store send message')
        this.$set(this.ephemeral.pendingMessages[index], 'hasFailed', true)
      }, 2000)
    },
    retryMessage (index) {
      this.$set(this.ephemeral.pendingMessages[index], 'hasFailed', false)

      setTimeout(() => {
        console.log('TODO $store send message')
        this.$set(this.ephemeral.pendingMessages[index], 'hasFailed', true)
      }, 2000)
      console.log('TODO $store - retry sending a message')
    }
  }
}
</script>
