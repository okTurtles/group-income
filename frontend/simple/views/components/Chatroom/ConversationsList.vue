<template>
  <div>
    <!-- REVIEW - maybe this kind of text should be the style for .subtitle -->
    <i18n tag="h2" class="has-text-grey is-uppercase c-subtitle">Private Messages</i18n>
    <list hasMargin>
      <list-item tag="router-link" variant="solid"
        v-for="id in list.order"
        :badgeCount="list.conversations[id].unreadCount"
        :to="buildUrl(id)" append
      >
        <!-- REVIEW - Create UserAvatarNamed.vue - places with this: SideBar Profile, Pay Group -->
        <div class="c-userAvatarNamed">
          <avatar hasMargin size="sm"
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
    /** List of conversations - shape: {
      order: [] - see fakeStore.js - privateMessagesSortedByTime,
      conversations: - see fakeStore.js - users or groupChannels
    }
    */
    list: Object,
    /** Relative conversation's route - ex: '/messages/' */
    routeName: {
      type: String,
      required: true
    },
    routePath: String,
    type: {
      type: String,
      required: true,
      validator (value) {
        return ['messages', 'channel'].indexOf(value) !== -1
      }
    }
  },
  data () {
    return {}
  },
  computed: {},
  methods: {
    // REVIEW - Maybe the url should be a prop
    buildUrl (conversationId) {
      const { type, list, routeName } = this
      const { name } = list.conversations[conversationId] || {}

      // NOTE/TODO - when getting messageConversation from $store is built,
      // this should be the most correct way of handling the router-link...

      /* return {
        path: `${routePath}${name}`
      } */

      // NOTE: ...until then let's use $route params as a "store"...
      return {
        name: routeName,
        params: {
          name, // :/name
          currentConversation: { type, id: conversationId } // messageConversation's prop
        }
      }
    }
  }
}
</script>
