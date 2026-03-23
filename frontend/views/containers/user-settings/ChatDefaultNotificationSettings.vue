<template lang='pug'>
.menu-tile-block
  legend.tab-legend
    i.icon-comments.legend-icon
    i18n.legend-text Chat default settings

  menu
    MenuItem(
      tabId='chat-notifications'
      :isExpandable='true'
    )
      template(#lower='')
        .lower-section-container
          | TODO!

    MenuItem(
      tabId='chat-sounds'
      :isExpandable='true'
    )
      template(#lower='')
        .lower-section-container
          | TODO!
</template>

<script>
import UserSettingsTabMenuItem from './UserSettingsTabMenuItem.vue'

export default {
  name: 'DefaultChatNotificationSettings',
  components: {
    MenuItem: UserSettingsTabMenuItem
  },
  data () {
    return {
      ephemeral: {}
    }
  }
}
</script>
