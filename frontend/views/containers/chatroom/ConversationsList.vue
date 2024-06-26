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

      span.c-channel-name {{list.channels[id].displayName || list.channels[id].name}}

      .c-unreadcount-wrapper
        .pill.is-danger(
          v-if='list.channels[id].unreadMessagesCount'
        ) {{limitedUnreadCount(list.channels[id].unreadMessagesCount)}}
</template>

<script>
import sbp from '@sbp/sbp'
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
