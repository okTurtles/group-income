<template lang='pug'>
.c-conversation-list(data-test='channelsList')
  .c-group-members-header
    h3.is-title-4 {{title}}

    button.button.is-small.is-outlined(
      data-test='newChannelButton'
      @click='openModal("CreateNewChannelModal")'
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
      :badgeCount='list.channels[id].unreadCount'
      :to='buildUrl(id)'
    )
      avatar(
        v-if='list.channels[id].picture'
        :src='list.channels[id].picture'
        size='sm'
      )

      span {{list.channels[id].displayName || list.channels[id].name}}
</template>

<script>
import sbp from '@sbp/sbp'
import { OPEN_MODAL } from '@utils/events.js'
import ListItem from '@components/ListItem.vue'
import Avatar from '@components/Avatar.vue'
import { CHATROOM_PRIVACY_LEVEL } from '@model/contracts/constants.js'

export default ({
  name: 'ConversationsList',
  components: {
    ListItem,
    Avatar
  },
  props: {
    title: String,
    /** List of channels - shape: {
      order: [] - group channels in order,
      channels: - group channels
    }
    */
    list: Object,
    routeName: String
  },
  methods: {
    getChannelTestData (id) {
      const prefix = `channel-${this.list.channels[id].name}`
      return prefix + (this.list.channels[id].joined ? '-in' : '-out')
    },
    getIcon (id) {
      const isPrivate = this.list.channels[id].privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE
      const isJoined = this.list.channels[id].joined
      return isPrivate ? 'lock' : (isJoined ? 'hashtag' : 'plus')
    },
    buildUrl (chatRoomId) {
      // NOTE - This should be $store responsability
      // ...but for now I've used the $route params just for mocked layout purposes
      return {
        name: this.routeName,
        params: { chatRoomId }
      }

      // ... once $store is implement, we can just pass the following:
      // return { path: `${routePath}${name}` }
    },
    openModal (modal, queries) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, queries)
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
</style>
