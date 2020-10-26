<template lang='pug'>
page(pageTestName='dashboard' pageTestHeaderName='groupName')
  template(#title='')
    .c-header
      i(
        v-if='summary.private !== undefined'
        :class='`icon-${ summary.private ? "lock" : "hashtag" }`'
      )
      | {{summary.title}}
  template(#description='')
    .c-header-description
      | {{ members.size + ' ' + L('members') }} ∙
      .is-unstyled.c-link(
        tag='button'
        v-if='summary.description'
        @click='openModal("EditChannelDescriptionModal")'
      )
        | {{ summary.description }}
        i.icon-pencil-alt
      i18n.is-unstyled.c-link(
        tag='button'
        v-else
        @click='openModal("EditChannelDescriptionModal")'
      )
        | Add description
  template(#sidebar='')
    chat-nav(
      :title='L("Chat")'
    )
      conversations-list(
        :title='L("Channels")'
        routepath='/group-chat/'
        :list='channels'
        route-name='GroupChatConversation'
        :type='type.groups'
      )

      group-members(:title='L("Direct Messages")' action='chat')

  .card.c-card
    chat-main(
      :summary='summary'
      :details='details'
      :type='type.groups'
    )
</template>

<script>
import { mapGetters } from 'vuex'
import Page from '@components/Page.vue'
import { chatTypes, users, groupA } from '@containers/chatroom/fakeStore.js'
import ConversationsList from '@containers/chatroom/ConversationsList.vue'
import ChatNav from '@containers/chatroom/ChatNav.vue'
import ChatMain from '@containers/chatroom/ChatMain.vue'
import chatroom from '@containers/chatroom/chatroom.js'
import GroupMembers from '@containers/dashboard/GroupMembers.vue'
import { OPEN_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'

export default {
  name: 'GroupChat',
  mixins: [
    chatroom
  ],
  components: {
    Page,
    ChatNav,
    ChatMain,
    ConversationsList,
    GroupMembers
  },
  computed: {
    ...mapGetters([
      'groupsByName'
    ]),
    channels () {
      return {
        order: groupA.channelsSorted,
        conversations: groupA.channels
      }
    },
    members () {
      return {
        order: groupA.members,
        conversations: users,
        size: groupA.members.length
      }
    },
    type () {
      return {
        members: chatTypes.INDIVIDUAL,
        groups: chatTypes.GROUP
      }
    }
  },
  methods: {
    openModal (modal, props) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, props)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-card {
  margin-top: 1.5rem;
  padding: 0 0 1.5rem 0;

  &:last-child {
    margin-bottom: 2rem;
  }
}

.c-header {
  i {
    margin-right: 0.5rem;
    color: $text_1;
  }
}

.c-link {
  color: $text_0;
  border-color: $text_0;
  margin-left: .2rem;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    text-decoration: underline;

    .icon-pencil-alt{
      opacity: 1;
      margin-left: .2rem;
    }
  }
}

.icon-pencil-alt {
  opacity: 0;
  margin-left: .2rem;
  transition: opacity 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.c-header-description {
  display: none;
  @include desktop {
    display: flex;
  }
}
</style>
