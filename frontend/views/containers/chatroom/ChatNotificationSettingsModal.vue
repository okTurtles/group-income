<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Notifications")')
    template(slot='title')
      i18n Notifications

    form(novalidate @submit.prevent='' data-test='updateNotificationSettings')
      fieldset.is-column
        legend.legend
          i18n Send notifications for:
        label.radio
          input.input(
            type='radio'
            name='messageNotification'
            :value='options.ALL_MESSAGES'
            v-model='$v.form.messageNotification.$model'
          )
          i18n All new messages
        label.radio(v-if='!isDM')
          input.input(
            type='radio'
            name='messageNotification'
            :value='options.MENTIONS'
            v-model='$v.form.messageNotification.$model'
          )
          i18n Mentions
        label.radio
          input.input(
            type='radio'
            name='messageNotification'
            :value='options.NOTHING'
            v-model='$v.form.messageNotification.$model'
          )
          i18n Nothing

      fieldset.is-column
        legend.legend
          i18n Sounds:
        label.radio
          input.input(
            type='radio'
            name='messageSound'
            :value='options.ALL_MESSAGES'
            v-model='$v.form.messageSound.$model'
          )
          i18n Play sounds for all new messages
        label.radio(v-if='!isDM')
          input.input(
            type='radio'
            name='messageSound'
            :value='options.MENTIONS'
            v-model='$v.form.messageSound.$model'
          )
          i18n Play sounds for mentions
        label.radio
          input.input(
            type='radio'
            name='messageSound'
            :value='options.NOTHING'
            v-model='$v.form.messageSound.$model'
          )
          i18n Mute all sounds from chat notifications

      .buttons
        i18n.is-outlined(tag='button' @click='close') Cancel
        i18n.is-success(
          tag='button'
          @click='submit'
          data-test='updateNotificationSettings'
        ) Save
</template>

<script>
import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { mapGetters } from 'vuex'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import {
  CHATROOM_PRIVACY_LEVEL, MESSAGE_NOTIFY_SETTINGS, GLOBAL_NOTIFICATION_SETTINGS_KEY,
  GLOBAL_MESSAGE_NOTIFY_SETTINGS
} from '@model/contracts/shared/constants.js'
import { NEW_CHATROOM_NOTIFICATION_SETTINGS } from '@utils/events.js'

export default ({
  name: 'ChatNotificationSettingsModal',
  mixins: [validationMixin],
  components: {
    ModalTemplate
  },
  computed: {
    ...mapGetters([
      'chatNotificationSettings',
      'currentChatRoomId',
      'isGroupDirectMessage'
    ]),
    isDM () {
      return this.isGroupDirectMessage(this.currentChatRoomId)
    }
  },
  data () {
    return {
      options: MESSAGE_NOTIFY_SETTINGS,
      form: {
        messageNotification: null,
        messageSound: null
      }
    }
  },
  created () {
    if (this.chatNotificationSettings[this.currentChatRoomId]) {
      const settings = this.chatNotificationSettings[this.currentChatRoomId]
      const handleLegacySetting = (setting) => {
        // MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES legacy setting has been replaced with MESSAGE_NOTIFY_SETTINGS.MENTIONS (details in model/contracts/shared/constants.js)
        // So need to handle it here for backward compatibility.
        return setting === MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES
          ? this.isDM ? MESSAGE_NOTIFY_SETTINGS.ALL_MESSAGES : MESSAGE_NOTIFY_SETTINGS.MENTIONS
          : setting
      }
      this.form.messageNotification = handleLegacySetting(settings.messageNotification)
      this.form.messageSound = handleLegacySetting(settings.messageSound)
    } else {
      const rootState = sbp('state/vuex/state')
      const privacyLevelPrivate = rootState[this.currentChatRoomId]?.attributes?.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE
      const globalSettings = this.chatNotificationSettings[GLOBAL_NOTIFICATION_SETTINGS_KEY]
      const mappings = {
        // mapping global settings to per-chatroom settings
        [GLOBAL_MESSAGE_NOTIFY_SETTINGS.ALL_MESSAGES]: MESSAGE_NOTIFY_SETTINGS.ALL_MESSAGES,
        [GLOBAL_MESSAGE_NOTIFY_SETTINGS.DM_AND_MENTIONS]: this.isDM || privacyLevelPrivate
          ? MESSAGE_NOTIFY_SETTINGS.ALL_MESSAGES
          : MESSAGE_NOTIFY_SETTINGS.MENTIONS,
        [GLOBAL_MESSAGE_NOTIFY_SETTINGS.NOTHING]: MESSAGE_NOTIFY_SETTINGS.NOTHING
      }

      this.form.messageNotification = mappings[globalSettings.messageNotification]
      this.form.messageSound = mappings[globalSettings.messageSound]
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    submit () {
      sbp('okTurtles.events/emit', NEW_CHATROOM_NOTIFICATION_SETTINGS, {
        chatRoomID: this.currentChatRoomId,
        settings: this.form
      })
      this.close()
    }
  },
  validations: {
    form: {
      messageNotification: {
        [L('This field is required')]: required
      },
      messageSound: {
        [L('This field is required')]: required
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

fieldset:nth-child(2) {
  margin-top: 2rem;
}
</style>
