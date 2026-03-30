<template lang='pug'>
.menu-tile-block
  legend.tab-legend
    i.icon-comments.legend-icon
    i18n.legend-text Chat default notifications

  menu
    MenuItem(
      ref='msgNotificationsTile'
      tabId='chat-notifications'
      :isExpandable='true'
    )
      template(#info='')
        span.has-text-1 {{ getDisplayShort(globalDefaultSettings.messageNotification) }}
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

          .c-save-btn-container(v-if='showSaveBtn.messageNotification')
            i18n.is-small.is-success(
              tag='button'
              type='button'
              @click.stop='saveGlobalDefaultSettings("messageNotification")'
            ) Save
    MenuItem(
      ref='msgSoundTile'
      tabId='chat-sounds'
      :isExpandable='true'
    )
      template(#info='')
        span.has-text-1 {{ getDisplayShort(globalDefaultSettings.messageSound) }}
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

          .c-save-btn-container(v-if='showSaveBtn.messageSound')
            i18n.is-small.is-success(
              tag='button'
              type='button'
              @click.stop='saveGlobalDefaultSettings("messageSound")'
            ) Save
</template>

<script>
import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { mapGetters } from 'vuex'
import UserSettingsTabMenuItem from './UserSettingsTabMenuItem.vue'
import { GLOBAL_MESSAGE_NOTIFY_SETTINGS, GLOBAL_NOTIFICATION_SETTINGS_KEY } from '@model/contracts/shared/constants.js'
import { NEW_CHATROOM_NOTIFICATION_SETTINGS } from '@utils/events.js'

export default {
  name: 'DefaultChatNotificationSettings',
  components: {
    MenuItem: UserSettingsTabMenuItem
  },
  computed: {
    ...mapGetters(['chatNotificationSettings']),
    globalDefaultSettings () {
      return this.chatNotificationSettings[GLOBAL_NOTIFICATION_SETTINGS_KEY]
    },
    showSaveBtn () {
      return {
        messageNotification: this.form.messageNotification !== this.globalDefaultSettings.messageNotification,
        messageSound: this.form.messageSound !== this.globalDefaultSettings.messageSound
      }
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
    },
    saveGlobalDefaultSettings (settingsKey) {
      sbp('okTurtles.events/emit', NEW_CHATROOM_NOTIFICATION_SETTINGS, {
        isGlobal: true,
        settings: {
          ...this.globalDefaultSettings,
          [settingsKey]: this.form[settingsKey]
        }
      })

      const tileRef = settingsKey === 'messageNotification' ? this.$refs.msgNotificationsTile : this.$refs.msgSoundTile
      if (tileRef) {
        tileRef.toggleExpanded()
      }
    }
  },
  created () {
    this.form.messageNotification = this.globalDefaultSettings.messageNotification
    this.form.messageSound = this.globalDefaultSettings.messageSound
  }
}
</script>

<style lang="scss" scoped>
.c-save-btn-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
