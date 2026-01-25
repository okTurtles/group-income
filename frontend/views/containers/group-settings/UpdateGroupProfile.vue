<template lang='pug'>
.c-update-group-profile
  avatar-upload(v-bind='avatarProps')

  .card.c-form-wrapper
    form(@submit.prevent='')
      label.field
        .c-label-container
          i18n.label Group name
          char-length-indicator(
            :current-length='nameCharLen'
            :max='config.nameMaxChar'
            :error='nameCharLen > config.nameMaxChar'
          )

        input.input(
          type='text'
          :class='{ error: $v.form.groupName.$error }'
          :maxlength='config.nameMaxChar'
          v-model='form.groupName'
          @input='debounceField("groupName")'
          @blur='updateField("groupName")'
          v-error:groupName=''
          data-test='groupName'
        )

      label.field
        .c-label-container
          i18n.label About the group
          char-length-indicator(
            :current-length='descCharLen'
            :max='config.descMaxChar'
            :error='descCharLen > config.descMaxChar'
          )

        textarea.textarea(
          :class='{ error: $v.form.sharedValues.$error }'
          :maxlength='config.descMaxChar'
          v-model='form.sharedValues'
          v-error:sharedValues = ''
          @input='debounceField("sharedValues")'
          @blur='updateField("sharedValues")'
          data-test='sharedValues'
        )

      banner-scoped(ref='formMsg' data-test='formMsg' :allowA='true')

      .buttons.is-end
        button-submit.is-success(
          @click='saveGroupProfile'
          data-test='saveBtn'
        ) {{ L('Save changes') }}

</template>

<script>
import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import { validationMixin } from 'vuelidate'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { required, maxLength } from 'vuelidate/lib/validators'
import { GROUP_NAME_MAX_CHAR, GROUP_DESCRIPTION_MAX_CHAR } from '@model/contracts/shared/constants.js'
import { L } from '@common/common.js'
import AvatarUpload from '@components/AvatarUpload.vue'
import CharLengthIndicator from '@components/CharLengthIndicator.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'

export default {
  name: 'UpdateGroupProfile',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    AvatarUpload,
    CharLengthIndicator,
    ButtonSubmit,
    BannerScoped
  },
  data () {
    const { groupName, sharedValues } = this.$store.getters.groupSettings
    return {
      form: {
        groupName,
        sharedValues
      },
      config: {
        nameMaxChar: GROUP_NAME_MAX_CHAR,
        descMaxChar: GROUP_DESCRIPTION_MAX_CHAR
      }
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupSettings'
    ]),
    avatarProps () {
      return {
        avatar: this.groupSettings.groupPicture,
        sbpParams: {
          selector: 'gi.actions/group/updateSettings',
          contractID: this.currentGroupId,
          key: 'groupPicture'
        },
        avatarType: 'group'
      }
    },
    nameCharLen () {
      return this.form.groupName?.length || 0
    },
    descCharLen () {
      return this.form.sharedValues?.length || 0
    }
  },
  methods: {
    refreshForm () {
      const { groupName, sharedValues } = this.groupSettings
      this.form = { groupName, sharedValues }
    },
    async saveGroupProfile () {
      if (this.$v.form.$invalid) {
        this.$refs.formMsg.danger(L('The form is invalid.'))
        return
      }

      const attrs = {}
      for (const key in this.form) {
        if (this.form[key] !== this.groupSettings[key]) {
          attrs[key] = this.form[key]
        }
      }

      try {
        await sbp('gi.actions/group/updateSettings', {
          contractID: this.currentGroupId, data: attrs
        })
        this.$refs.formMsg.success(L('Your changes were saved!'))
      } catch (e) {
        console.error('GroupSettings saveSettings() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
    }
  },
  validations: {
    form: {
      groupName: {
        [L('This field is required')]: required,
        [L('Group name cannot exceed {maxchar} characters', { maxchar: GROUP_NAME_MAX_CHAR })]: maxLength(GROUP_NAME_MAX_CHAR)
      },
      sharedValues: {
        [L('Group description cannot exceed {maxchar} characters', { maxchar: GROUP_DESCRIPTION_MAX_CHAR })]: maxLength(GROUP_DESCRIPTION_MAX_CHAR)
      }
    }
  },
  watch: {
    groupSettings () {
      // re-fetch the latest correct values whenever the user switches groups
      this.refreshForm()
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-update-group-profile {
  position: relative;
  width: 100%;
}

.c-form-wrapper {
  margin-top: 1rem;

  @include desktop {
    margin-top: 2rem;
  }
}

.c-label-container {
  position: relative;
  display: flex;
  column-gap: 0.5rem;
  align-items: flex-end;

  .label {
    flex-grow: 1;
  }
}
</style>
