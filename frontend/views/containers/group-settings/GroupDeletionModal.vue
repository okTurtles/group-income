<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Delete group")')
    template(slot='title')
      i18n Delete group

    form(novalidate @submit.prevent='submit' data-test='deleteGroup')
      p
        i18n(v-if='groupMembersCount > 1' :args='{groupMembersCount}') This group has {groupMembersCount} active members.
        span(v-if='groupMembersCount > 1') {{' '}}
        i18n Leaving the group when you're the the admin will delete it and all its associated data.
      i18n.has-text-bold(tag='p') Are you sure you want to delete this group?
      i18n(
        tag='p'
        :args='LTags("strong")'
      ) All messages exchanged between members will be {strong_} deleted permanently{_strong}.

      banner-simple.c-banner(severity='danger')
        i18n(
          :args='LTags("strong")'
        ) This action {strong_}cannot be undone{_strong}.

      form(novalidate @submit.prevent='submit')
        label.field
          i18n.label(:args='{ code }') Type "{code}" below
          input.input(
            :class='{error: $v.form.confirmation.$error}'
            type='text'
            v-model='form.confirmation'
            @input='debounceField("confirmation")'
            @blur='updateField("confirmation")'
            v-error:confirmation=''
            data-test='confirmation'
          )

        banner-scoped(ref='formMsg')

        .buttons
          i18n.is-outlined(tag='button' type='button' @click='close') Cancel
          button-submit.is-danger(
            @click='submit'
            :disabled='$v.form.$invalid'
            data-test='btnSubmit'
            ) {{ L('Delete Group') }}
</template>

<script>
import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { validationMixin } from 'vuelidate'
import { mapGetters, mapState } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import { required } from 'vuelidate/lib/validators'
import BannerSimple from '@components/banners/BannerSimple.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'

export default ({
  name: 'GroupDeletionModal',
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
        confirmation: null
      }
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupMembersCount', 'groupSettings', 'ourIdentityContractId'
    ]),
    code () {
      // NOTE: this.groupSettings.groupName could be undefined while leaving the group
      const groupName = this.groupSettings.groupName || ''
      return L('DELETE {GROUP_NAME}', { GROUP_NAME: groupName.toUpperCase() })
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      if (this.$v.form.$invalid) { return }
      try {
        await sbp('chelonia/out/deleteContract', this.currentGroupId, {
          [this.currentGroupId]: {
            billableContractID: this.ourIdentityContractId
          }
        })
        this.close()
      } catch (e) {
        console.error('GroupDeletionModal submit() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
    }
  },
  validations: {
    form: {
      confirmation: {
        [L('This field is required')]: required,
        [L('Does not match')]: function (value) {
          return value === this.code
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
