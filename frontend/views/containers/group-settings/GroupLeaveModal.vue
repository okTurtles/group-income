<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Leave group")')
    template(slot='title')
      i18n Leave group

    form(novalidate @submit.prevent='' data-test='leaveGroup')
      i18n(
        tag='p'
        :args='LTags("strong")'
      ) If you leave, you will stop having access to the {strong_}group chat{_strong} and {strong_}contributions{_strong}. Re-joining the group is possible, but requires other members to {strong_}vote and reach an agreement{_strong}.

      banner-simple.c-banner(severity='danger')
        i18n(
          :args='LTags("strong")'
        ) This action {strong_}cannot be undone{_strong}.

      label.field
        i18n.label Username
        input.input(
          :class='{error: $v.form.username.$error}'
          type='text'
          v-model='form.username'
          @input='debounceField("username")'
          @blur='updateField("username")'
          data-test='username'
          v-error:username='{ attrs: { "data-test": "usernameError" } }'
        )

      label.field
        i18n.label(:args='{ code }') Type "{code}" below
        input.input(
          :class='{error: $v.form.confirmation.$error}'
          type='text'
          v-model='form.confirmation'
          @input='debounceField("confirmation")'
          @blur='updateField("confirmation")'
          v-error:confirmation='{ attrs: { "data-test": "confirmationError" } }'
          data-test='confirmation'
        )

      banner-scoped(ref='formMsg')

      .buttons
        i18n.is-outlined(tag='button' type='button' @click='close') Cancel
        button-submit.is-danger(
          @click='submit'
          :disabled='$v.form.$invalid'
          data-test='btnSubmit'
          ) {{ L('Leave Group') }}
</template>

<script>
import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import { mapGetters, mapState } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import BannerSimple from '@components/banners/BannerSimple.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { normalizeString } from 'turtledash'

export default ({
  name: 'GroupLeaveModal',
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
        username: null,
        confirmation: null
      }
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupSettings',
      'ourUsername',
      'ourIdentityContractId'
    ]),
    code () {
      // NOTE: this.groupSettings.groupName could be undefined while leaving the group
      const groupName = this.groupSettings.groupName || ''
      return L('LEAVE {GROUP_NAME}', {
        GROUP_NAME: groupName.toUpperCase()
      })
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      if (this.$v.form.$invalid) { return }
      try {
        const groupContractID = this.currentGroupId
        await sbp('gi.actions/group/removeMember', {
          contractID: groupContractID,
          data: {}
        })
        this.close()
      } catch (e) {
        console.error('GroupLeaveModal submit() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
    }
  },
  validations: {
    form: {
      username: {
        [L('This field is required')]: required,
        [L('Your username is different')]: function (value) {
          return value === this.ourUsername
        }
      },
      confirmation: {
        [L('This field is required')]: required,
        [L('Does not match')]: function (value) {
          return normalizeString(value || '') === normalizeString(this.code)
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
</style>
