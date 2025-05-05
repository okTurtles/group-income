<template lang='pug'>
.c-conversation-list(data-test='channelsList')
  .c-group-members-header
    h3.is-title-4 {{title}}

    button.button.is-small.is-outlined(
      data-test='newChannelButton'
      @click='onClickedNewChannel'
    )
      i.icon-plus.is-prefix
      i18n New

  ul
    list-item(
      v-for='id in list.order'
      :key='id'
      tag='router-link'
      variant='solid'
      :data-test='getChannelTestData(id)'
      :icon='getIcon(id)'
      :to='buildUrl(id)'
      @click='$emit("redirect")'
    )
      avatar(
        v-if='list.channels[id].picture'
        :src='list.channels[id].picture'
        size='sm'
      )

      span.c-channel-name(
        :class='{ "has-text-bold": shouldStyleBold(id) }'
      ) {{list.channels[id].displayName || list.channels[id].name}}

      .c-unreadcount-wrapper
        .pill.is-danger(
          v-if='list.channels[id].unreadMessagesCount > 0'
        ) {{ limitedUnreadCount(list.channels[id].unreadMessagesCount) }}
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import ListItem from '@components/ListItem.vue'
import Avatar from '@components/Avatar.vue'
import { CHATROOM_PRIVACY_LEVEL } from '@model/contracts/shared/constants.js'
import { L } from '@common/common.js'

export default ({
  name: 'ConversationsList',
  components: {
    ListItem,
    Avatar
  },
  props: {
    title: {
      type: String,
      default: L('Channels')
    },
    /** List of channels - shape: {
      order: [] - group channels in order,
      channels: - group channels
    }
    */
    list: Object,
    routeName: String
  },
  computed: {
    ...mapGetters([
      'isChatRoomManuallyMarkedUnread',
      'groupChatRooms',
      'ourUnreadMessages'
    ]),
    hasNotReadTheLatestMessage () {
      // This computed props check if the chatrooms in the list have any messages that are not seen by the user yet.
      const entries = Object.keys(this.list.channels).map(chatId => {
        const chatroomLatestState = this.$store.state.contracts[chatId]
        if (!chatroomLatestState || chatroomLatestState.type !== 'gi.contracts/chatroom') { return null }

        const latestMsgInfo = { msgHash: chatroomLatestState.HEAD, height: chatroomLatestState.height }
        const chatReadUntilInfo = this.ourUnreadMessages?.[chatId]?.readUntil

        if (!chatReadUntilInfo) {
          // NOTE: If a user creates a new channel but leaves before any message is sent/received in there,
          // it's 'readUntil' data is undefined. In this case, we can determine whether the latest message is not seen yet by checking if
          // its height value is >= 3. (3 is the height value of the second message in every chatroom)
          return [chatId, latestMsgInfo.height >= 3]
        } else {
          return [chatId, latestMsgInfo.height > chatReadUntilInfo.createdHeight]
        }
      }).filter(Boolean)

      return Object.fromEntries(entries)
    }
  },
  methods: {
    onClickedNewChannel () {
      this.openModal('CreateNewChannelModal')
      this.$emit('new')
    },
    getChannelTestData (id) {
      const prefix = `channel-${this.list.channels[id].name}`
      return prefix + (this.list.channels[id].joined ? '-in' : '-out')
    },
    getIcon (id) {
      const channelIcon = {
        [CHATROOM_PRIVACY_LEVEL.PRIVATE]: 'lock',
        [CHATROOM_PRIVACY_LEVEL.GROUP]: 'hashtag',
        [CHATROOM_PRIVACY_LEVEL.PUBLIC]: 'unlock-alt'
      }[this.list.channels[id].privacyLevel]
      return this.list.channels[id].joined ? channelIcon : 'plus'
    },
    buildUrl (chatRoomID) {
      // NOTE - This should be $store responsability
      // ...but for now I've used the $route params just for mocked layout purposes
      return {
        name: this.routeName,
        params: { chatRoomID }
      }

      // ... once $store is implement, we can just pass the following:
      // return { path: `${routePath}${name}` }
    },
    openModal (modal, queries) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, queries)
    },
    limitedUnreadCount (n) {
      const nLimit = 99
      if (n > nLimit) {
        return `${nLimit}+`
      } else {
        return `${n}`
      }
    },
    shouldStyleBold (chatRoomID) {
      return this.isChatRoomManuallyMarkedUnread(chatRoomID) ||
        this.list.channels[chatRoomID].unreadMessagesCount > 0 ||
        this.hasNotReadTheLatestMessage[chatRoomID] === true
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-group-members-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.c-channel-name {
  text-align: left;
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100px; // HACK: to truncate
}

.c-unreadcount-wrapper {
  width: 2rem;
  display: flex;
  justify-content: center;
}
</style>
