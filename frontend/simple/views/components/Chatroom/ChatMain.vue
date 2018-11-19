<template>
  <div class="c-chatmain" :class="{ isActive: summary.title }">
    <template v-if="summary.title">
      <main-header
        :description="summary.description"
        :routerBack="summary.routerBack"
      >
        <template slot="title">
          <avatar :src="summary.picture" alt=""
            class="c-header-avatar"
            size="sm"
            hasMargin
          />
          <i class="fa is-size-6 c-header-private" :class="{
            'fa-globe': summary.private === false,
            'fa-lock': summary.private === true,
          }" v-if="summary.private !== undefined"></i>
          {{summary.title}}
        </template>
        <template slot="actions">
          <button class="button is-icon">
            <i class="fa fa-user-plus"></i>
          </button>
          <button class="button is-icon">
            <!-- TODO later - show a tooltip on notifications snooze -->
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
                  <i18n>Option 1</i18n>
                </menu-item>
                <menu-item tag="button" itemId="hash-2" icon="heart">
                  <i18n>Option 2</i18n>
                </menu-item>
                <menu-item tag="button" itemId="hash-3" icon="heart">
                  <i18n>Option 3</i18n>
                </menu-item>
              </list>
            </menu-content>
          </menu-parent>
        </template>
      </main-header>

      <div class="c-body is-flex" :style="bodyStyles">
        <div v-if="details.isLoading">
          <loading />
          <!-- TODO later - Design a cool skeleton loading
            - this should be done only after knowing exactly how server gets each conversation data -->
        </div>
        <div class="c-body-conversation" ref="conversation" v-else>
          <conversation-greetings />
          <template v-for="(message, index) in details.conversation">
            <i18n class="subtitle c-divider" v-if="startedUnreadIndex === index">New messages</i18n>
            <message-notification v-if="message.from === 'notification'">
              {{message.text}}
            </message-notification>
            <component v-else v-bind="getMessageAt[index]"/>
          </template>
          <message
            v-for="(message, index) in ephemeral.pendingMessages"
            v-bind="getPendingAt[index]"
            @retry="retryMessage(index)"
          />
        </div>
      </div>
      <div class="c-footer">
        <send-area :title="summary.title"
          @send="handleSendMessage"
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

  .c-actions-content {
    top: $gi-spacer-lg;
    right: 0;
    left: auto;
    width: 10rem;
  }
}

.c-header-private {
  margin-right: $gi-spacer-xs;
}

.c-header-private,
.c-header-avatar {
  @include phablet {
    display: none;
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

.c-divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: $gi-spacer 0;

  &::before,
  &::after {
    content: "";
    flex-grow: 1;
    border-bottom: 1px solid $tertiary;
  }

  &::before {
    margin-right: $gi-spacer-sm;
  }

  &::after {
    margin-left: $gi-spacer-sm;
  }
}

@include phone {
  .c-chatmain {
    /* A - MVP static way - show / hide conversation */
    display: none;
    z-index: $gi-zindex-sidebar;

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
import MainHeader from '../MainHeader.vue'
import Avatar from '../Avatar.vue'
import Loading from '../Loading.vue'
import { List } from '../Lists/index.js'
import { MenuParent, MenuTrigger, MenuContent, MenuHeader, MenuItem } from '../Menu/index.js'
import Message from './Message.vue'
import messageVariantTypes from './messageVariantTypes.js'
import MessageInteractive from './MessageInteractive.vue'
import MessageNotification from './MessageNotification.vue'
import ConversationGreetings from '../../containers/Chatroom/ConversationGreetings.vue'
import SendArea from './SendArea.vue'
import { currentUserId, messageTypes } from '../../containers/Chatroom/fakeStore.js'

export default {
  name: 'ChatMain',
  components: {
    MainHeader,
    Avatar,
    Loading,
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
      type: Object, // { type: String, title: String, description: String, routerBack: String }
      default: {}
    },
    details: {
      type: Object, // { isLoading: Bool, conversation: Array, participants: Object }
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
        this.$nextTick(() => {
          window.scroll(0, document.body.offsetHeight)
        })
      } else {
        this.$refs.conversation && this.$refs.conversation.scroll(0, this.$refs.conversation.scrollHeight)
      }
    }
  },
  computed: {
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
        variant: message.hasFailed ? messageVariantTypes.FAILED : messageVariantTypes.SENT,
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
      return isCurrentUser ? messageVariantTypes.SENT : messageVariantTypes.RECEIVED
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
