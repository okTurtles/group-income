<template>
  <div class="is-flex c-chatmain" :class="{ isActive: info.title }">
    <template v-if="info.title">
      <!-- TODO ChatHeader - props: title, description, icons[], actions[] -->
      <header class="level is-mobile is-marginless c-header">
        <div class="level-left c-header-text">
          <button class="button is-icon" @click="goBack">
            <i class="fa fa-angle-left"></i>
          </button>
          <div class="gi-is-ellipsis">
            <h2 class="title is-size-5 is-marginless gi-is-ellipsis">{{ info.title }}</h2>
            <p class="is-size-7 has-text-grey gi-is-ellipsis" v-inf="info.description">{{ info.description }}</p>
          </div>
        </div>
        <div class="level-right">
        <button class="button is-icon">
          <!-- TODO design workflow to add a member to the conversation -->
          <i class="fa fa-user-plus"></i>
        </button>
        <menu-parent class="level-right">
          <menu-trigger class="is-icon">
            <i class="fa fa-ellipsis-v"></i>
          </menu-trigger>

          <!-- TODO be a drawer on mobile -->
          <!-- TODO this needs to be dynamic... -->
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
      </div>
      </header>
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
  flex-grow: 1;
  flex-direction: column;
}

.c-header {
  position: relative;
  padding: $gi-spacer $gi-spacer-sm;
  border-bottom: 1px solid $grey-lighter;
  min-height: 4.5rem;
  z-index: $gi-zindex-header;

  // fadeOutTop: a gradient mask to fadeout nav on scroll.
  // TODO - apply the same effect on sidebar
  &::after {
    content: "";
    position: absolute;
    bottom: -$gi-spacer-lg;
    left: 0;
    height: $gi-spacer-lg;
    width: 100%;
    background: linear-gradient($body-background-color, rgba($body-background-color, 0));
  }

  &-text {
    max-width: 70%;
  }

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

  .input {
    height: 40px;
  }
}

@include mobile {
  $speed: 300ms;

  .c-chatmain {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    max-height: 100vh;
    z-index: $gi-zindex-header;
    background: $body-background-color;
    transform: translate3d(100vw, 0, 0);
    transition: transform $speed;
    box-shadow: -1px 0 1px rgba($text, 0.07);

    &.isActive {
      transform: translate3d(0, 0, 0);
    }
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
    List,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuHeader,
    MenuItem,
    ConversationGreetings,
    Message,
    MessageInteractive,
    MessageNotification
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
    // force conversation viewport to be at the most recent messages
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
    goBack () {
      this.$router.go(-1)
    },
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
