<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Create a channel")')
    template(slot='title')
      i18n Create a channel

    form(novalidate @submit.prevent='' data-test='createChannel')
      label.field
        i18n.label.c-label-name Name
        .c-max-count(v-if='form.name') {{50 - form.name.length}}
        input.input(
          type='text'
          name='name'
          maxlength='50'
          :class='{ error: $v.form.name.$error }'
          v-model='form.name'
          data-test='createChannelName'
          @input='debounceField("name")'
          @blur='updateField("name")'
          v-error:name=''
        )

      label.field
        i18n.label Description
        textarea.textarea(
          name='description'
          :placeholder='L("Description of the channel")'
          maxlength='500'
          :class='{ error: $v.form.description.$error }'
          v-model='form.description'
          data-test='createChannelDescription'
          @input='debounceField("description")'
          @blur='updateField("description")'
          v-error:description=''
        )
        i18n.helper This is optional.

      label.field(v-if='isPublicChannelCreateAllowed')
        i18n.label Channel Privacy
        .selectbox(
          :class='{ error: $v.form.privacy.$error }'
        )
          select.select(
            :aria-label='L("Please select")'
            name='privacy'
            :value='form.privacy'
            @change='handlePrivacyLevel'
            @blur='updateField("privacy")'
          )
            option.placeholder(value='' disabled) {{L("Please select")}}
            option(
              v-for='(pLevel, index) in privacyLevels'
              :value='pLevel.value'
              :key='index'
            ) {{ pLevel.label }}

      label.c-inline-input(v-else)
        i18n.label Private channel
        input.switch(
          type='checkbox'
          :checked='form.private'
          data-test='createChannelPrivate'
          @change='toggleChannelPrivate'
        )

      hr(v-if='privacyLevel')

      .c-helper(v-if='privacyLevel')
        i(:class='`icon-${ privacyLevelIcon } c-group-i`')

        .helper(tag='p') {{ privacyLevelDescription }}

      banner-scoped(ref='formMsg')

      .buttons
        i18n.is-outlined(tag='button' @click='close') Cancel
        i18n.is-success(
          tag='button'
          data-test='createChannelSubmit'
          @click='submit'
          :disabled='$v.form.$invalid'
        ) Create channel
</template>

<script>
import sbp from '@sbp/sbp'
import { L, LError } from '@common/common.js'
import { validationMixin } from 'vuelidate'
import { mapState, mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import required from 'vuelidate/lib/validators/required'
import BannerScoped from '@components/banners/BannerScoped.vue'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { CHATROOM_TYPES, CHATROOM_PRIVACY_LEVEL } from '@model/contracts/shared/constants.js'

export default ({
  name: 'CreateNewChannelModal',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    ModalTemplate,
    BannerScoped
  },
  computed: {
    ...mapState(['currentGroupId']),
    ...mapGetters(['groupSettings', 'currentChatRoomState', 'getGroupChatRooms']),
    maxNameCharacters () {
      return this.currentChatRoomState.settings.maxNameLength
    },
    maxDescriptionCharacters () {
      return this.currentChatRoomState.settings.maxDescriptionLength
    },
    isPublicChannelCreateAllowed () {
      return this.groupSettings.publicChannelCreateAllowance
    },
    privacyLevels () {
      const privacyLabels = {
        [CHATROOM_PRIVACY_LEVEL.GROUP]: L('Group channel'),
        [CHATROOM_PRIVACY_LEVEL.PRIVATE]: L('Private channel'),
        [CHATROOM_PRIVACY_LEVEL.PUBLIC]: L('Public channel')
      }
      return Object.values(CHATROOM_PRIVACY_LEVEL).map(value => ({
        value, label: privacyLabels[value]
      }))
    },
    privacyLevel () {
      return this.isPublicChannelCreateAllowed
        ? this.form.privacy
        : !this.form.private ? CHATROOM_PRIVACY_LEVEL.GROUP : CHATROOM_PRIVACY_LEVEL.PRIVATE
    },
    privacyLevelDescription () {
      return {
        [CHATROOM_PRIVACY_LEVEL.PRIVATE]: L('Only added members will have access.'),
        [CHATROOM_PRIVACY_LEVEL.GROUP]: L('All group members will be added to this channel.'),
        [CHATROOM_PRIVACY_LEVEL.PUBLIC]: L('People from outside the group can see the channel\'s content')
      }[this.privacyLevel]
    },
    privacyLevelIcon () {
      return {
        [CHATROOM_PRIVACY_LEVEL.PRIVATE]: 'lock',
        [CHATROOM_PRIVACY_LEVEL.GROUP]: 'hashtag',
        [CHATROOM_PRIVACY_LEVEL.PUBLIC]: 'unlock-alt'
      }[this.privacyLevel]
    }
  },
  data () {
    return {
      form: {
        name: '',
        description: '',
        private: false,
        privacy: '',
        existingNames: []
      }
    }
  },
  created () {
    // HACK: using rootGetters inside validator makes `Duplicate channel name` error
    // as soon as a new channel is created
    this.form.existingNames = Object.keys(this.getGroupChatRooms)
      .map(cId => this.getGroupChatRooms[cId].name)
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      const { name, description } = this.form
      try {
        await sbp('gi.actions/group/addAndJoinChatRoom', {
          contractID: this.currentGroupId,
          data: {
            attributes: {
              name,
              description,
              privacyLevel: this.privacyLevel,
              type: CHATROOM_TYPES.GROUP
            }
          }
        })
      } catch (e) {
        this.$refs.formMsg.danger(L('Failed to create chat channel. {reportError}', LError(e)))
      }
      this.close()
    },
    toggleChannelPrivate (e) {
      this.form.private = e.target.checked
    },
    handlePrivacyLevel (e) {
      this.form.privacy = e.target.value
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
      },
      description: {
        [L('Reached character limit.')]: function (value) {
          return !value || Number(value.length) <= this.maxDescriptionCharacters
        }
      },
      privacy: {
        [L('This field is required')]: function (value) {
          return !this.isPublicChannelCreateAllowed || !!value
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
}

.c-inline-input {
  display: flex;
  justify-content: space-between;
}

hr {
  background-color: var(--general_0);
  margin: 1rem 0;
  height: 1px;
}

.helper {
  color: $text_1;
}

.c-helper {
  display: flex;
}

.c-group-i {
  margin-right: 0.5rem;
}

.select option.placeholder {
  display: none;
}
</style>
