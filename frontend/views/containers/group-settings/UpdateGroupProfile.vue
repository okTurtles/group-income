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
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import { validationMixin } from 'vuelidate'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { required, maxLength } from 'vuelidate/lib/validators'
import AvatarUpload from '@components/AvatarUpload.vue'
import CharLengthIndicator from '@components/CharLengthIndicator.vue'
import { GROUP_NAME_MAX_CHAR, GROUP_DESCRIPTION_MAX_CHAR } from '@model/contracts/shared/constants.js'
import { L } from '@common/common.js'

export default {
  name: 'UpdateGroupProfile',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    AvatarUpload,
    CharLengthIndicator
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
    margin-top: 3rem;
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
