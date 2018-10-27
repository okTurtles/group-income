<template>
  <div>
    <!-- REVIEW - This kind of title should be the style for .subtitle maybe ? -->
    <i18n tag="h2" class="has-text-grey is-size-7 is-uppercase c-subtitle">Private Messages</i18n>
    <list hasMargin>
      <list-item v-for="userId in list.timeOrder"
        tag="router-link" variant="solid"
        :to="`/messages/${list.users[userId].username}`" append
        :badgeCount="list.users[userId].unreadCount"
      >
        <!-- REVIEW - Create UserAvatarNamed.vue - places with this: SideBar Profile, Pay Group -->
        <div class="c-userAvatarNamed">
          <avatar hasMargin size="sm" :src="list.users[userId].avatar" />
          <span class="gi-is-ellipsis">{{list.users[userId].name}}</span>
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
  name: 'Chatroom',
  components: {
    List,
    ListItem,
    Avatar
  },
  props: {
    list: Object
    /* users Object shape
      {
        timeOrder: [UserId: Number]
        users: {
          UserId: {
            username: String
            name: String,
            imageProfile: String
            hasUnred: Boolean
          }
        }
      }
    */
  },
  data () {
    return {}
  },
  computed: {},
  methods: {}
}
</script>
