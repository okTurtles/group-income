<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Delete group")')
    template(slot='title')
      i18n Delete group

    form(novalidate @submit.prevent='submit')
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
          )

        banner-scoped(ref='formMsg')

        .buttons
          i18n.is-outlined(tag='button' @click='close') Cancel
          i18n.is-danger(
            tag='button'
            @click='submit'
            :disabled='$v.form.$invalid'
          ) Delete Group
</template>

<script>
import { L } from '@common/common.js'
import { validationMixin } from 'vuelidate'
import { mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import { required } from 'vuelidate/lib/validators'
import BannerSimple from '@components/banners/BannerSimple.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'

export default ({
  name: 'GroupDeletionModal',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    ModalTemplate,
    BannerSimple,
    BannerScoped
  },
  data () {
    return {
      form: {
        confirmation: null
      }
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings'
    ]),
    code () {
      return L('DELETE {GROUP_NAME}', { GROUP_NAME: this.groupSettings.groupName.toUpperCase() })
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    submit () {
      alert('TODO implement this')
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
