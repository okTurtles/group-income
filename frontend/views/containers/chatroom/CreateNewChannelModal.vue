<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Create a channel")')
    template(slot='title')
      i18n Create a channel

    form(novalidate @submit.prevent='' data-test='createChannel')
      label.field
        .c-name-label-container
          i18n.label.c-label-name Name
          char-length-indicator(
            v-if='form.name'
            :current-length='form.name.length || 0'
            :max='maxNameCharacters'
          )
        input.input(
          ref='name'
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
        i18n.helper.with-icon(v-if='!$v.form.name.$error' tag='p') Channel name can only contain lowercase letters, numbers, and hyphens(-).

      label.field
        .c-desc-label-container
          i18n.label Description
          char-length-indicator(
            v-if='form.description'
            :current-length='form.description.length || 0'
            :max='maxDescriptionCharacters'
            :error='$v.form.description.$error'
          )

        textarea.textarea(
          name='description'
          :placeholder='L("Description of the channel")'
          :maxlength='maxDescriptionCharacters'
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
            data-test='createChannelPrivacyLevel'
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

      banner-scoped(ref='formMsg' :allowA='true')

      .buttons
        i18n.button.is-outlined(@click='close') Cancel
        button-submit.is-success(
          data-test='createChannelSubmit'
          @click='submit'
          :disabled='$v.form.$invalid'
        )
          i18n Create channel
</template>

<script>
import sbp from '@sbp/sbp'
import { L, LError } from '@common/common.js'
import { validationMixin } from 'vuelidate'
import { mapState, mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import required from 'vuelidate/lib/validators/required'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import CharLengthIndicator from '@components/CharLengthIndicator.vue'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import {
  CHATROOM_TYPES,
  CHATROOM_PRIVACY_LEVEL,
  CHATROOM_NAME_LIMITS_IN_CHARS,
  CHATROOM_DESCRIPTION_LIMITS_IN_CHARS
} from '@model/contracts/shared/constants.js'

const privacyLevelToDisplay = {
  [CHATROOM_PRIVACY_LEVEL.GROUP]: {
    label: L('Group channel'),
    description: L('All group members will be able to see or join this channel.'),
    icon: 'hashtag'
  },
  [CHATROOM_PRIVACY_LEVEL.PRIVATE]: {
    label: L('Private channel'),
    description: L('Only added members will have access.'),
    icon: 'lock'
  },
  [CHATROOM_PRIVACY_LEVEL.PUBLIC]: {
    label: L('Public channel'),
    description: L('People from outside the group can see the channel\'s content'),
    icon: 'unlock-alt'
  }
}

export default ({
  name: 'CreateNewChannelModal',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    ModalTemplate,
    BannerScoped,
    ButtonSubmit,
    CharLengthIndicator
  },
  computed: {
    ...mapState(['currentGroupId']),
    ...mapGetters(['groupSettings', 'groupChatRooms']),
    maxNameCharacters () {
      return CHATROOM_NAME_LIMITS_IN_CHARS
    },
    maxDescriptionCharacters () {
      return CHATROOM_DESCRIPTION_LIMITS_IN_CHARS
    },
    isPublicChannelCreateAllowed () {
      return this.groupSettings.allowPublicChannels
    },
    privacyLevels () {
      return Object.values(CHATROOM_PRIVACY_LEVEL).map(value => ({
        value, label: privacyLevelToDisplay[value].label
      }))
    },
    privacyLevel () {
      return this.isPublicChannelCreateAllowed
        ? this.form.privacy
        : !this.form.private ? CHATROOM_PRIVACY_LEVEL.GROUP : CHATROOM_PRIVACY_LEVEL.PRIVATE
    },
    privacyLevelDescription () {
      return privacyLevelToDisplay[this.privacyLevel].description
    },
    privacyLevelIcon () {
      return privacyLevelToDisplay[this.privacyLevel].icon
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
    this.form.existingNames = Object.keys(this.groupChatRooms).map(cId => this.groupChatRooms[cId].name)
  },
  mounted () {
    this.$refs.name.focus()
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      const { name, description } = this.form
      try {
        this.$refs.formMsg.clean()
        await sbp('gi.app/group/addAndJoinChatRoom', {
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
        this.close()
      } catch (e) {
        this.$refs.formMsg.danger(L('Failed to create chat channel. {reportError}', LError(e)))
      }
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
  },
  watch: {
    'form.name' (newVal) {
      if (newVal.length) {
        this.form.name = newVal.replace(/\s/g, '-') // replace all whitespaces with '-'
          .replace(/[^a-z0-9-]/g, '') // remove all non-alphanumeric characters except '-'
          .toLowerCase()
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-name-label-container,
.c-desc-label-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

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
