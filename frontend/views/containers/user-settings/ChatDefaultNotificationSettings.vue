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
          fieldset.is-column
            label.radio
              input.input(
                type='radio'
                name='messageNotification'
                :value='options.ALL_MESSAGES'
                v-model='form.messageNotification'
              )
              i18n All new messages
            label.radio
              input.input(
                type='radio'
                name='messageNotification'
                :value='options.DIRECT_MESSAGES'
                v-model='form.messageNotification'
              )
              i18n Direct messages and mentions
            label.radio
              input.input(
                type='radio'
                name='messageNotification'
                :value='options.NOTHING'
                v-model='form.messageNotification'
              )
              i18n Nothing

    MenuItem(
      tabId='chat-sounds'
      :isExpandable='true'
    )
      template(#lower='')
        .lower-section-container
          fieldset.is-column
            label.radio
              input.input(
                type='radio'
                name='messageSound'
                :value='options.ALL_MESSAGES'
                v-model='form.messageSound'
              )
              i18n All new messages
            label.radio
              input.input(
                type='radio'
                name='messageSound'
                :value='options.DIRECT_MESSAGES'
                v-model='form.messageSound'
              )
              i18n Direct messages and mentions
            label.radio
              input.input(
                type='radio'
                name='messageSound'
                :value='options.NOTHING'
                v-model='form.messageSound'
              )
              i18n Nothing
</template>

<script>
import UserSettingsTabMenuItem from './UserSettingsTabMenuItem.vue'
import { MESSAGE_NOTIFY_SETTINGS } from '@model/contracts/shared/constants.js'

export default {
  name: 'DefaultChatNotificationSettings',
  components: {
    MenuItem: UserSettingsTabMenuItem
  },
  data () {
    return {
      options: MESSAGE_NOTIFY_SETTINGS,
      form: {
        messageNotification: null,
        messageSound: null
      }
    }
  }
}
</script>
