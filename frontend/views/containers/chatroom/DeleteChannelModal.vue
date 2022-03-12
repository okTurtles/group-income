<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Delete channel")')
    template(slot='title')
      i18n Delete channel

    form(novalidate @submit.prevent='' data-test='deleteGroup')
      i18n(
        tag='strong'
        :args='{ name: chatRoomAttributes.name }'
      ) Are you sure you want to delete {name}?

      ul.c-list
        i18n.c-list-item(tag='li') All messages will be deleted;
        i18n.c-list-item(tag='li') Members will be removed from the channel;
        i18n.c-list-item(tag='li') This channel will no longer be visible.

      banner-simple.c-banner(severity='danger')
        i18n(
          :args='LTags("strong")'
        ) This action {strong_}cannot be undone{_strong}.

      label.checkbox(data-test='deleteChannelConfirmation')
        input.input(type='checkbox' name='confirmation' v-model='form.confirmation')
        i18n(:args='{ name: chatRoomAttributes.name, ...LTags("strong") }') Yes, I want to {strong_}delete {name} permanently{_strong}.

      banner-scoped(ref='formMsg')

      .buttons
        i18n.is-outlined(tag='button' @click='close') Cancel
        button-submit.is-danger(
          @click='submit'
          :disabled='$v.form.$invalid'
          data-test='deleteChannelSubmit'
          ) {{ L('Delete channel') }}
</template>

<script>
import sbp from '~/shared/sbp.js'
import { validationMixin } from 'vuelidate'
import { mapGetters, mapState } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import BannerSimple from '@components/banners/BannerSimple.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import L from '@view-utils/translations.js'
import {
  MESSAGE_TYPES,
  MESSAGE_NOTIFICATIONS
} from '@model/contracts/constants.js'

export default ({
  name: 'DeleteChannelModal',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    ModalTemplate,
    BannerSimple,
    BannerScoped,
    ButtonSubmit
  },
  data () {
    return {
      form: {
        confirmation: false
      }
    }
  },
  computed: {
    ...mapGetters(['currentChatRoomId', 'chatRoomAttributes', 'generalChatRoomId']),
    ...mapState(['currentGroupId'])
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      if (this.$v.form.$invalid) { return }

      try {
        await sbp('gi.actions/group/deleteChatRoom', {
          contractID: this.currentGroupId,
          data: { chatRoomID: this.currentChatRoomId },
          hooks: {
            postpublish: (message) => {
              sbp('gi.actions/chatroom/addMessage', {
                contractID: this.generalChatRoomId,
                data: {
                  type: MESSAGE_TYPES.NOTIFICATION,
                  notification: {
                    type: MESSAGE_NOTIFICATIONS.DELETE_CHANNEL,
                    channelName: this.chatRoomAttributes.name,
                    channelDescription: this.chatRoomAttributes.description
                  }
                }
              })
              sbp('gi.actions/chatroom/delete', { contractID: this.currentChatRoomId, data: {} })
            }
          }
        })
      } catch (e) {
        console.error('RemoveChannelModal submit() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
    }
  },
  validations: {
    form: {
      confirmation: {
        [L('Please confirm that you want to delete this channel')]: value => value === true
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-banner {
  margin: 1.5rem 0 1rem 0;

  ::v-deep strong {
    color: $danger_0;
  }
}

.c-list {
  padding-top: 0.5rem;

  .c-list-item {
    list-style: initial;
    margin: 0.5rem 1rem;
  }
}
</style>
