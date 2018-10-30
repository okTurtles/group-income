<template>
  <div class="c-chatmain is-flex" v-if="info">
    <!-- TODO ChatHeader - props: title, description, icons[], actions[] -->
    <header class="level is-marginless c-header">
      <div class="level-left">
        <div>
          <h2 class="title is-size-5 is-marginless">{{ info.title }}</h2>
          <p class="is-size-7 has-text-grey">{{ info.description }}</p>
        </div>
      </div>
      <div class="level-right">
        <button class="button is-icon">
          <i class="fa fa-user-plus"></i>
        </button>
        <menu-parent class="level-right">
          <menu-trigger class="is-icon">
            <i class="fa fa-ellipsis-v"></i>
          </menu-trigger>

          <!-- TODO be a drawer on mobile -->
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
    </div>
    <div class="c-footer">
      <!-- TODO - reuse Contribution's input markup here when #482 is merged -->
      <div class="field has-addons is-fullwidth">
        <p class="control is-expanded">
          <input class="input c-input" type="text" :placeholder="customSendPlaceholder">
        </p>
        <p class="control">
          <button class="button">
            Send
          </button>
        </p>
      </div>
    </div>
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
  padding: $gi-spacer;
  border-bottom: 1px solid $grey-lighter;
  min-height: 4.5rem;
  z-index: 2;

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
  }
}

.c-footer {
  position: relative;
  padding: 0 $gi-spacer $gi-spacer;

  .input {
    height: 40px;
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
    info: Object,
    conversation: Array
  },
  data () {
    return {
      config: {
        sendPlaceholder: [this.L('Be nice to'), this.L('Be cool to'), this.L('Have fun with')]
      }
    }
  },
  updated () {
    // force conversation viewport to be at the most recent messages
    this.$refs.conversation.scroll(0, this.$refs.conversation.scrollHeight)
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
