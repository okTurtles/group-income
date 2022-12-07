<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Notifications")')
    template(slot='title')
      i18n Notifications

    form(novalidate @submit.prevent='' data-test='updateNotificationSettings')
      fieldset.is-column
        legend.legend Send notifications for:
        label.radio
          input.input(
            type='radio'
            name='messageNotification'
            :value='options.ALL_MESSAGES'
            v-model='$v.form.messageNotification.$model'
          )
          span All new messages
        label.radio
          input.input(
            type='radio'
            name='messageNotification'
            :value='options.DIRECT_MESSAGES'
            v-model='$v.form.messageNotification.$model'
          )
          span Direct messages and mentions
        label.radio
          input.input(
            type='radio'
            name='messageNotification'
            :value='options.NOTHING'
            v-model='$v.form.messageNotification.$model'
          )
          span Nothing

      fieldset.is-column
        legend.legend Sounds:
        label.radio
          input.input(
            type='radio'
            name='messageSound'
            :value='options.ALL_MESSAGES'
            v-model='$v.form.messageSound.$model'
          )
          span Play sounds for all new messages
        label.radio
          input.input(
            type='radio'
            name='messageSound'
            :value='options.DIRECT_MESSAGES'
            v-model='$v.form.messageSound.$model'
          )
          span Play sounds for direct messages and mentions
        label.radio
          input.input(
            type='radio'
            name='messageSound'
            :value='options.NOTHING'
            v-model='$v.form.messageSound.$model'
          )
          span Mute all sounds from chat notifications

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

export default ({
  name: 'ChatNotificationSettingsModal',
  mixins: [validationMixin],
  components: {
    ModalTemplate
  },
  computed: {
    ...mapGetters(['notificationSettings'])
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
    this.form.messageNotification = this.notificationSettings.messageNotification
    this.form.messageSound = this.notificationSettings.messageSound
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    submit () {
      sbp('state/vuex/commit', 'setNotificationSettings', this.form)
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
