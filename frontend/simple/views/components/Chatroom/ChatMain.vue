<template>
  <div class="c-chatmain is-flex-tablet" :class="{ isActive: info.title }">
    <template v-if="info.title">
      <chat-header
        :title="info.title"
        :description="info.description"
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

      <div class="c-body is-flex">
        <loading v-if="loading" />
        <template v-else>
          <div class="c-body-conversation" ref="conversation">
            <conversation-greetings />

            <message v-for="(message, index) in conversation"
              :who="who(message.from)"
              :avatar="avatar(message.from)"
              :variant="variant(message.from)"
              :isSameSender="isSameSender[index]"
              :hideWho="false && info.type !== 'messages'"
            >
              {{message.text}}
            </message>

            <message v-for="(message, index) in ephemeral.pendingMessages"
              :who="who(message.from)"
              :avatar="avatar(message.from)"
              :variant="message.hasFailed ? 'failed' : 'sent'"
              :isSameSender="index > 0"
              @retry="handleMessageRetry(index)"
            >
              {{message.text}}
            </message>

            <!-- TODO messageInteractive -->
            <!-- TODO messageNotification -->
          </div>
        </template>
      </div>
      <div class="c-footer">
        <!-- TODO - reuse Contribution's input markup here when #482 is merged -->
        <div class="c-send">
          <textarea class="c-send-textarea"textAreaStyles
            ref="sendInput"
            :disabled="loading"
            :placeholder="customSendPlaceholder"
            :syle="textAreaStyles"
          ></textarea>
          <i18n tag="button" class="c-send-btn" ref="sendBtn" @click="handleSendClick">Send</i18n>
          <div class="c-send-mask" ref="sendMask"></div>
        </div>
      </div>
    </template>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-chatmain {
  position: relative;
  flex-grow: 1;
  flex-direction: column;
  background-color: $body-background-color;

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
    max-height: 100%;
    overflow: scroll;
    padding: $gi-spacer-lg 0 $gi-spacer;
    -webkit-overflow-scrolling: touch;
  }
}

.c-footer {
  position: relative;
  padding: 0 $gi-spacer-sm $gi-spacer;
}

$initialHeight: 2.5rem;

.c-send {
  position: relative;

  &-textarea,
  &-mask {
    display: block;
    width: 100%;
    border: 1px solid $grey;
    border-radius: $radius;
    padding: $gi-spacer-sm $gi-spacer-lg $gi-spacer-xs $gi-spacer-sm;
    line-height: 1.3;
    height: $initialHeight;
    font-size: 1rem;
  }

  &-btn {
    position: absolute;
    top: 0;
    right: $gi-spacer-sm;
    padding: $gi-spacer-sm;
    height: 100%;
  }

  &-mask {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    pointer-events: none;
  }
}

@include mobile {
  .c-chatmain {
    width: 100vw;
    min-height: 100vh;
    z-index: $gi-zindex-header;
    background: $body-background-color;

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

  .c-body {
    padding-top: 4rem;
    padding-bottom: 4rem;
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

@include tablet {
  .c-header {
    padding: $gi-spacer;
  }

  .c-footer {
    padding: 0 $gi-spacer $gi-spacer;
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
    ConversationGreetings
  },
  props: {
    info: {
      type: Object,
      default: {}
    },
    conversation: Array
  },
  data () {
    return {
      config: {
        sendPlaceholder: [this.L('Be nice to'), this.L('Be cool to'), this.L('Have fun with')],
        sendBtnWidth: null,
        sendInputHeight: null
      },
      ephemeral: {
        conversationIsLoading: false,
        pendingMessages: []
      }
    }
  },
  created () {
    this.config.sendBtnWidth = this.$refs.sendBtn.offsetWidth
    this.config.sendInputHeight = this.$refs.sendInput.offsetHeight
  },
  updated () {
    if (this.info.title) {
      // force conversation viewport to be at the bottom (most recent messages)

      // ...when is on mobile
      setTimeout(function () {
        window.scroll(0, document.body.offsetHeight)
      }, 0) // REVIEW: without timeout it scrolls before the DOM is ready... why?

      // ...when is on tablet/desktop
      this.$refs.conversation && this.$refs.conversation.scroll(0, this.$refs.conversation.scrollHeight)
    }
  },
  computed: {
    isSameSender () {
      return this.conversation.map((message, key) => {
        const sameAsPrev = message.from === (this.conversation[key - 1] && this.conversation[key - 1].from)

        return sameAsPrev
      })
    },
    currentUserAttr () {
      return {
        ...this.$store.getters.currentUserIdentityContract.attributes,
        id: currentUserId
      }
    },
    customSendPlaceholder () {
      return `${this.config.sendPlaceholder[Math.floor(Math.random() * this.config.sendPlaceholder.length)]} ${this.info.title}`
    },
    textAreaStyles () {
      // TODO CONTINUE HERE...
      return {
        paddingRight: '100px',
        height: '80px'
      }
      //
      // const initialHeight = this.ephemeral.initialSendInputHeight
      // const rows = Number.round(this.$refs.sendMask.offsetHeigth / initialHeight)
      // return {
      //   paddingRight: this.$refs.sendButton.offsetWidth,
      //   height: initialHeight * rows
      // }
    }
  },
  methods: {
    who (fromId = this.currentUserAttr.id) {
      if (this.currentUserAttr.id === fromId) {
        return this.currentUserAttr.displayName || this.currentUserAttr.name
      }

      const user = this.info.participants[fromId]

      return user.displayName || user.name
    },
    variant (fromId = this.currentUserAttr.id) {
      return this.currentUserAttr.id === fromId ? 'sent' : 'received'
    },
    avatar (fromId = this.currentUserAttr.id) {
      return this.currentUserAttr.id === fromId
        ? this.currentUserAttr.picture
        : this.info.participants[fromId].picture
    },
    handleMessageRetry (index) {
      this.$set(this.ephemeral.pendingMessages[index], 'hasFailed', false)

      setTimeout(() => {
        console.log('TODO $store send message')
        this.$set(this.ephemeral.pendingMessages[index], 'hasFailed', true)
      }, 2000)
      console.log('TODO $store - retry sending a message')
    },
    handleSendClick () {
      console.log('sending...')
      const index = this.ephemeral.pendingMessages.length
      this.ephemeral.pendingMessages.push({
        from: this.currentUserAttr.id,
        text: this.$refs.sendInput.value
      })

      this.$refs.sendInput.value = ''

      setTimeout(() => {
        console.log('TODO $store send message')
        this.$set(this.ephemeral.pendingMessages[index], 'hasFailed', true)
      }, 2000)
    }
  }
}
</script>
