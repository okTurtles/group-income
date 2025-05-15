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
        label.radio
          input.input(
            type='radio'
            name='messageNotification'
            :value='options.DIRECT_MESSAGES'
            v-model='$v.form.messageNotification.$model'
          )
          i18n Direct messages and mentions
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
        label.radio
          input.input(
            type='radio'
            name='messageSound'
            :value='options.DIRECT_MESSAGES'
            v-model='$v.form.messageSound.$model'
          )
          i18n Play sounds for direct messages and mentions
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
import { MESSAGE_NOTIFY_SETTINGS } from '@model/contracts/shared/constants.js'
import { NEW_CHATROOM_NOTIFICATION_SETTINGS } from '@utils/events.js'

export default ({
  name: 'ChatNotificationSettingsModal',
  mixins: [validationMixin],
  components: {
    ModalTemplate
  },
  computed: {
    ...mapGetters(['chatNotificationSettings', 'currentChatRoomId'])
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
    let settingsFromState
    if (this.chatNotificationSettings[this.currentChatRoomId]) {
      settingsFromState = this.chatNotificationSettings[this.currentChatRoomId]
    } else {
      settingsFromState = this.chatNotificationSettings.default
    }
    this.form.messageNotification = settingsFromState.messageNotification
    this.form.messageSound = settingsFromState.messageSound
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
