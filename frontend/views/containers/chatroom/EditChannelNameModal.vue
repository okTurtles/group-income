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
          ref='name'
          type='text'
          name='name'
          :maxlength='maxNameCharacters'
          :class='{ error: $v.form.name.$error }'
          v-model='form.name'
          @input='debounceField("name")'
          @blur='updateField("name")'
          v-error:name=''
          data-test='updateChannelName'
        )

      banner-scoped(ref='formMsg')

      .buttons
        i18n.button.is-outlined(@click='close') Cancel
        i18n.is-success(
          tag='button'
          @click='submit'
          :disabled='submitting || $v.form.$invalid'
          data-test='updateChannelNameSubmit'
        ) Save
</template>

<script>
import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { mapState, mapGetters } from 'vuex'
import { validationMixin } from 'vuelidate'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import required from 'vuelidate/lib/validators/required'
import BannerScoped from '@components/banners/BannerScoped.vue'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'

export default ({
  name: 'EditChannelNameModal',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    ModalTemplate,
    BannerScoped
  },
  computed: {
    ...mapState(['currentGroupId']),
    ...mapGetters(['currentChatRoomId', 'currentChatRoomState', 'groupGeneralChatRoomId', 'groupChatRooms']),
    maxNameCharacters () {
      return this.currentChatRoomState.settings.maxNameLength
    }
  },
  data () {
    return {
      channelId: this.$route.query.channel,
      submitting: false,
      form: {
        name: null,
        existingNames: []
      }
    }
  },
  created () {
    this.form.name = this.currentChatRoomState.attributes.name
    this.form.existingNames = Object.keys(this.groupChatRooms).map(cId => this.groupChatRooms[cId].name)
  },
  mounted () {
    if (this.groupGeneralChatRoomId === this.currentChatRoomId) {
      this.close()
    }
    this.$refs.name.focus()
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      try {
        if (this.submitting) return
        this.submitting = true
        if (this.currentChatRoomState.attributes.name === this.form.name) {
          // TODO: No need to update chatroom name. Display message box or toast or sth else
          console.log('TODO: Channel name is not changed')
        } else if (this.currentChatRoomId === this.groupGeneralChatRoomId) {
          // TODO: display warning message '"General" chatroom can not be renamed'
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
        this.close()
      } catch (e) {
        console.error('RenameChannelModal submit() error:', e)
        this.$refs.formMsg.danger(e.message)
      } finally {
        this.submitting = false
      }
    }
  },
  validations: {
    form: {
      name: {
        [L('This field is required')]: required,
        [L('Reached character limit.')]: function (value) {
          return value ? Number(value.length) <= this.maxNameCharacters : false
        },
        [L('Duplicate channel name')]: (name, siblings) => {
          for (const existingName of siblings.existingNames) {
            if (name.toUpperCase() === existingName.toUpperCase()) {
              return false
            }
          }
          return true
        }
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
