<template lang='pug'>
.c-conversation-list
  .c-group-members-header
    i18n.is-title-4(tag='h3') {{title}}

    button.button.is-small.is-outlined(
      data-test='inviteButton'
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
      :icon='getIcon(id)'
      :badgeCount='list.conversations[id].unreadCount'
      :to='buildUrl(id)'
    )
      avatar(
        v-if='list.conversations[id].picture'
        :src='list.conversations[id].picture'
        size='sm'
      )

      span {{list.conversations[id].displayName || list.conversations[id].name}}
</template>

<script>
import { OPEN_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'
import ListItem from '@components/ListItem.vue'
import Avatar from '@components/Avatar.vue'

export default {
  name: 'ConversationsList',
  components: {
    ListItem,
    Avatar
  },
  props: {
    title: String,
    /** List of conversations - shape: {
      order: [] - see fakeStore.js - individualMessagesSorted,
      conversations: - see fakeStore.js - users or groupChannels
    }
    */
    list: Object,
    routeName: String,
    type: String
  },
  methods: {
    getIcon (id) {
      const isPrivate = this.list.conversations[id].private
      return isPrivate === undefined ? '' : (isPrivate ? 'lock' : 'hashtag')
    },
    buildUrl (id) {
      const { list, routeName, type } = this
      const { name } = list.conversations[id] || {}

      // NOTE - This should be $store responsability
      // ...but for now I've used the $route params just for mocked layout purposes
      return {
        name: routeName,
        params: {
          chatName: name,
          currentConversation: { type, id }
        }
      }

      // ... once $store is implement, we can just pass the following:
      // return { path: `${routePath}${name}` }
    },
    openModal (modal, queries) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, queries)
    }
  }
}
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
