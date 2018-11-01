<template>
  <div class="c-chatmain is-flex-tablet" :class="{ isActive: info.title }">
    <template v-if="info.title">
      <chat-header
        :title="info.title"
        :description="info.description"
        routerBack="/messages"
      >
        <button class="button is-icon">
          <!-- TODO design workflow to add a member to the conversation -->
          <i class="fa fa-user-plus"></i>
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

            <!-- TODO message "failed" -->

            <!-- TODO messageInteractive -->
            <!-- TODO messageNotification -->
          </div>
        </template>
      </div>
      <div class="c-footer">
        <!-- TODO - reuse Contribution's input markup here when #482 is merged -->
        <div class="field has-addons is-fullwidth">
          <p class="control is-expanded">
            <input class="input c-input" :disabled="loading" type="text" :placeholder="customSendPlaceholder">
          </p>
          <p class="control">
            <button class="button">
              Send
            </button>
          </p>
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

  .input {
    height: 40px;
  }
}

@include mobile {
  $speed: 300ms;

  .c-chatmain {
    width: 100vw;
    min-height: 100vh;
    z-index: $gi-zindex-header;
    background: $body-background-color;
    // transition: transform $speed;

    /* A - MVP static way
    - show / hide conversation */
    display: none;

    &.isActive {
      display: block;
    }

    /* B - NEXT dynamic way
    - slideIn from right - more complex - needs tricky work
    - TODO - If there's time at the end, I'll do this.
    */
    // box-shadow: -1px 0 1px rgba($text, 0.07);
    // transform: translate3d(100vw, 0, 0);

    // &.isActive {
    //   transform: translate3d(0, 0, 0);
    //
    //   &.isSet {
    //     // NOTE: position:fixed cant be mixed with transform
    //     transform: none;
    //   }
    // }
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
        sendPlaceholder: [this.L('Be nice to'), this.L('Be cool to'), this.L('Have fun with')]
      },
      ephemeral: {
        conversationIsLoading: false
      }
    }
  },
  updated () {
    console.log('updated!')
    // CONTINUE HEREEEE
    // force conversation viewport to be at the most recent messages

    // when is on mobile
    document.body.scroll(0, document.body.offsetHeight)

    console.log('chamou?')

    // when is on tablet/desktop
    this.$refs.conversation && this.$refs.conversation.scroll(0, this.$refs.conversation.scrollHeight)
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
    }
  },
  methods: {
    who (fromId) {
      if (this.currentUserAttr.id === fromId) {
        return this.currentUserAttr.displayName || this.currentUserAttr.name
      }

      const user = this.info.participants[fromId]

      return user.displayName || user.name
    },
    variant (fromId) {
      return this.currentUserAttr.id === fromId ? 'sent' : 'received'
    },
    avatar (fromId) {
      return this.currentUserAttr.id === fromId
        ? this.currentUserAttr.picture
        : this.info.participants[fromId].picture
    }
  }
}
</script>
