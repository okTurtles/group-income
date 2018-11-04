<template>
  <div class="c-list">
    <!-- TODO/REVIEW - maybe this kind of text should be the style for .subtitle -->
    <h2 class="has-text-grey is-uppercase c-subtitle">{{title}}</h2>
    <list hasMargin>
      <list-item v-for="id in list.order"
        tag="router-link"
        variant="solid"
        :badgeCount="list.conversations[id].unreadCount"
        :to="buildUrl(id)"
      >
        <div class="c-userAvatarNamed">
          <avatar hasMargin
            size="sm"
            v-if="list.conversations[id].picture"
            :src="list.conversations[id].picture"
          />
          <span class="gi-is-ellipsis">{{list.conversations[id].displayName || list.conversations[id].name}}</span>
        </div>
      </list-item>
    </list>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-list:not(:first-child) {
  margin: $gi-spacer*1.5 0;
}

.c-subtitle {
  padding-left: $gi-spacer-sm;
}

.c-userAvatarNamed {
  display: flex;
  align-items: center;
}
</style>
<script>
import { List, ListItem } from '../../components/Lists/index.js'
import Avatar from '../../components/Avatar.vue'

export default {
  name: 'ConversationsList',
  components: {
    List,
    ListItem,
    Avatar
  },
  props: {
    title: String,
    /** List of conversations - shape: {
      order: [] - see fakeStore.js - privateMessagesSortedByTime,
      conversations: - see fakeStore.js - users or groupChannels
    }
    */
    list: Object,
    routePath: String
  },
  data () {
    return {}
  },
  computed: {},
  methods: {
    buildUrl (conversationId) {
      const { list, routePath } = this
      const { name } = list.conversations[conversationId] || {}

      return { path: `${routePath}${name}` }
    }
  }
}
</script>
