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

        i18n.helper.with-icon(v-if='!$v.form.name.$error' tag='p') Channel name can only contain lowercase letters, numbers, and hyphens(-).

      banner-scoped(ref='formMsg')

      .buttons
        i18n.button.is-outlined(@click='close') Cancel
        i18n.is-success(
          tag='button'
          @click='submit'
          :disabled='saveBtnDisabled'
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
    },
    saveBtnDisabled () {
      return this.submitting ||
        this.form.name === this.form.currentName ||
        this.$v.form.$invalid
    }
  },
  data () {
    return {
      submitting: false,
      form: {
        name: null,
        currentName: null,
        existingNames: []
      }
    }
  },
  created () {
    this.form.currentName = this.currentChatRoomState.attributes.name
    this.form.name = this.form.currentName
    this.form.existingNames = Object.keys(this.groupChatRooms)
      .map(cId => this.groupChatRooms[cId].name)
      .filter(name => name !== this.form.currentName)
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
        await sbp('gi.actions/group/renameChatRoom', {
          contractID: this.currentGroupId,
          data: {
            chatRoomID: this.currentChatRoomId,
            name: this.form.name
          }
        })
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
  },
  watch: {
    'form.name' (newVal) {
      if (newVal.length) {
        this.form.name = newVal.replace(/\s/g, '-') // replace all whitespaces with '-'
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '') // remove all non-alphanumeric characters except '-'
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
