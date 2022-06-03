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
          data-test='updateChannelDescription'
        )
        i18n.helper This is optional.

      banner-scoped(ref='formMsg')

      .buttons
        i18n.is-outlined(tag='button' @click.prevent='close') Cancel
        i18n.is-success(
          tag='button'
          @click='submit'
          :disabled='$v.form.$invalid'
          data-test='updateChannelDescriptionSubmit'
        ) Save
</template>

<script>
import sbp from '@sbp/sbp'
import {
  L
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path
import { validationMixin } from 'vuelidate'
import { mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import BannerSimple from '@components/banners/BannerSimple.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'

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
    ...mapGetters(['currentChatRoomId', 'groupSettings', 'currentChatRoomState']),
    maxDescriptionCharacters () {
      return this.currentChatRoomState.settings.maxDescriptionLength
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
        [L('Reached character limit.')]: function (value) {
          return value ? Number(value.length) <= this.maxDescriptionCharacters : false
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
