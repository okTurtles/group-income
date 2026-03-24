<template lang='pug'>
.menu-tile-block
  legend.tab-legend
    i.icon-comments.legend-icon
    i18n.legend-text Chat default notifications

  menu
    MenuItem(
      tabId='chat-notifications'
      :isExpandable='true'
    )
      template(#info='')
        span.has-text-1 {{ getDisplayShort(form.messageNotification) }}
      template(#lower='')
        .lower-section-container
          fieldset.is-column
            label.radio
              input.input(
                type='radio'
                name='messageNotification'
                :value='config.options.ALL_MESSAGES'
                v-model='form.messageNotification'
              )
              i18n All new messages
            label.radio
              input.input(
                type='radio'
                name='messageNotification'
                :value='config.options.DM_AND_MENTIONS'
                v-model='form.messageNotification'
              )
              i18n Direct messages and mentions
            label.radio
              input.input(
                type='radio'
                name='messageNotification'
                :value='config.options.NOTHING'
                v-model='form.messageNotification'
              )
              i18n Nothing

    MenuItem(
      tabId='chat-sounds'
      :isExpandable='true'
    )
      template(#info='')
        span.has-text-1 {{ getDisplayShort(form.messageSound) }}
      template(#lower='')
        .lower-section-container
          fieldset.is-column
            label.radio
              input.input(
                type='radio'
                name='messageSound'
                :value='config.options.ALL_MESSAGES'
                v-model='form.messageSound'
              )
              i18n All new messages
            label.radio
              input.input(
                type='radio'
                name='messageSound'
                :value='config.options.DM_AND_MENTIONS'
                v-model='form.messageSound'
              )
              i18n Direct messages and mentions
            label.radio
              input.input(
                type='radio'
                name='messageSound'
                :value='config.options.NOTHING'
                v-model='form.messageSound'
              )
              i18n Nothing
</template>

<script>
import { L } from '@common/common.js'
import { mapGetters } from 'vuex'
import UserSettingsTabMenuItem from './UserSettingsTabMenuItem.vue'
import { MESSAGE_NOTIFY_SETTINGS, CHATROOM_GLOBAL_NOTIFICATION_SETTINGS_KEY, GLOBAL_MESSAGE_NOTIFY_SETTINGS } from '@model/contracts/shared/constants.js'

export default {
  name: 'DefaultChatNotificationSettings',
  components: {
    MenuItem: UserSettingsTabMenuItem
  },
  computed: {
    ...mapGetters(['chatNotificationSettings']),
    ChannelDefaultSettings () {
      return this.chatNotificationSettings[CHATROOM_GLOBAL_NOTIFICATION_SETTINGS_KEY.CHANNEL]
    }
  },
  data () {
    return {
      config: {
        options: GLOBAL_MESSAGE_NOTIFY_SETTINGS,
        optionsDisplayShort: {
          [GLOBAL_MESSAGE_NOTIFY_SETTINGS.ALL_MESSAGES]: L('All'),
          [GLOBAL_MESSAGE_NOTIFY_SETTINGS.DM_AND_MENTIONS]: L('DM/Mentions'),
          [GLOBAL_MESSAGE_NOTIFY_SETTINGS.NOTHING]: L('None')
        }
      },
      form: {
        messageNotification: null,
        messageSound: null
      }
    }
  },
  methods: {
    getDisplayShort (value) {
      return this.config.optionsDisplayShort[value]
    }
  },
  created () {
    this.form.messageNotification = this.ChannelDefaultSettings.messageNotification
    this.form.messageSound = this.ChannelDefaultSettings.messageSound
  }
}
</script>
