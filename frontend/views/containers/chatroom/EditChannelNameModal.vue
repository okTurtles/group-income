<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Rename channel")')
    template(slot='title')
      i18n Rename channel

    form(novalidate @submit.prevent='')
      label.field
        i18n.label.c-label-name Name
        .c-max-count(
          v-if='form.name'
          :class='{"is-danger": form.name.length >= maxNameCharacters}'
        ) {{maxNameCharacters - form.name.length}}

        input.input(
          type='text'
          name='name'
          maxlength='maxNameCharacters'
          :class='{ error: $v.form.name.$error }'
          v-model='form.name'
          @input='debounceField("name")'
          @blur='updateField("name")'
          v-error:name=''
        )

      banner-scoped(ref='formMsg')

      .buttons
        i18n.is-outlined(tag='button' @click='close') Cancel
        i18n.is-success(
          tag='button'
          @click='submit'
          :disabled='$v.form.$invalid'
        ) Save
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapState, mapGetters } from 'vuex'
import { validationMixin } from 'vuelidate'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import required from 'vuelidate/lib/validators/required'
import maxLength from 'vuelidate/lib/validators/maxLength'
import BannerScoped from '@components/banners/BannerScoped.vue'
import L from '@view-utils/translations.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { CHATROOM_NAME_LIMITS_IN_CHARS } from '@model/contracts/constants.js'

export default ({
  name: 'EditChannelNameModal',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    ModalTemplate,
    BannerScoped
  },
  computed: {
    ...mapState(['currentGroupId', 'currentChatRoomId']),
    ...mapGetters(['currentChatRoomState']),
    maxNameCharacters () {
      return CHATROOM_NAME_LIMITS_IN_CHARS
    }
  },
  data () {
    return {
      channelId: this.$route.query.channel,
      form: {
        name: null
      }
    }
  },
  created () {
    this.form.name = this.currentChatRoomState.attributes.name
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      try {
        if (this.currentChatRoomState.attributes.name === this.form.name) {
          // TODO: No need to update chatroom name. Display message box or toast or sth else
          console.log('TODO: Channel name is not changed')
        } else if (!this.currentChatRoomState.attributes.editable) {
          // TODO: display message box '"General" chatroom can not be renamed'
          console.log('TODO: "General" chatroom can not be renamed')
        } else {
          await sbp('gi.actions/group/renameChatRoom', {
            contractID: this.currentGroupId,
            data: {
              chatRoomID: this.currentChatRoomId,
              name: this.form.name
            }
          })
        }
      } catch (e) {
        console.error('RenameChannelModal submit() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
      this.close()
    }
  },
  validations: {
    form: {
      name: {
        [L('This field is required')]: required,
        maxLength: maxLength(CHATROOM_NAME_LIMITS_IN_CHARS)
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-label-name {
  float: left;
}

.c-max-count {
  float: right;
  color: $text_1;

  &.is-danger {
    color: $danger_0;
  }
}
</style>
