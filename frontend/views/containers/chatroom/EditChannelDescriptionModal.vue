<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Channel description")')
    template(slot='title')
      i18n Channel description

    form(novalidate @submit.prevent='')
      label.field
        .c-label-group
          i18n.label Description
          .limit(
            v-if='form.description'
            :class='{"is-danger": form.description.length >= maxDescriptionCharacters}'
          ) {{ maxDescriptionCharacters - form.description.length }}

        textarea.textarea(
          name='description'
          :placeholder='L("Description of the channel")'
          maxlength='maxDescriptionCharacters'
          :class='{ error: $v.form.description.$error }'
          v-model='form.description'
          @input='debounceField("description")'
          @blur='updateField("description")'
          v-error:description=''
        )
        i18n.helper This is optional.

      banner-scoped(ref='formMsg')

      .buttons
        i18n.is-outlined(tag='button' @click.prevent='close') Cancel
        i18n.is-success(
          tag='button'
          @click='submit'
          :disabled='$v.form.$invalid'
        ) Save
</template>

<script>
import sbp from '~/shared/sbp.js'
import { validationMixin } from 'vuelidate'
import { mapState, mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import BannerSimple from '@components/banners/BannerSimple.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import L from '@view-utils/translations.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { CHATROOM_DESCRIPTION_LIMITS_IN_CHARS } from '@model/contracts/constants.js'

export default ({
  name: 'EditChannelDescriptionModal',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    ModalTemplate,
    BannerSimple,
    BannerScoped
  },
  data () {
    return {
      form: {
        description: null
      }
    }
  },
  computed: {
    ...mapState(['currentChatRoomId']),
    ...mapGetters([
      'groupSettings', 'currentChatRoomState'
    ]),
    maxDescriptionCharacters () {
      return CHATROOM_DESCRIPTION_LIMITS_IN_CHARS
    },
    code () {
      return L('DELETE {GROUP_NAME}', { GROUP_NAME: this.groupSettings.groupName.toUpperCase() })
    }
  },
  created () {
    this.form.description = this.currentChatRoomState.attributes.description
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      try {
        await sbp('gi.actions/chatroom/changeDescription', {
          contractID: this.currentChatRoomId,
          data: {
            description: this.form.description
          }
        })
      } catch (e) {
        console.error('ChangeChannelDescriptionModal submit() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
      this.close()
    }
  },
  validations: {
    form: {
      description: {
        [L('The description is limited to {max} characters', {
          max: CHATROOM_DESCRIPTION_LIMITS_IN_CHARS
        })]: function (value) {
          return value ? Number(value.length) <= CHATROOM_DESCRIPTION_LIMITS_IN_CHARS : false
        }
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-banner {
  margin: 1.5rem 0;
}

.c-label-group {
  display: flex;
  justify-content: space-between;
}

.is-danger {
  color: $danger_0;
}
</style>
