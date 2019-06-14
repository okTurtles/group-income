<template lang="pug">
.c-conversation-list
  label.label {{title}}

  ul
    list-item(
      v-for='id in list.order'
      :key='id'
      tag='router-link'
      variant='solid'
      :icon='getIcon(id)'
      :badgecount='list.conversations[id].unreadCount'
      :to='buildUrl(id)'
    )
      avatar(
        v-if='list.conversations[id].picture'
        :src='list.conversations[id].picture'
      )

      span {{list.conversations[id].displayName || list.conversations[id].name}}

</template>

<script>
import { ListItem } from '@components/Lists/index.js'
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
  data () {
    return {}
  },
  computed: {},
  methods: {
    getIcon (id) {
      const isPrivate = this.list.conversations[id].private
      return isPrivate === undefined ? '' : (isPrivate ? 'lock' : 'globe')
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
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";
</style>
