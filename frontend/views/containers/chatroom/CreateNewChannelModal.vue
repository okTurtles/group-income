<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Create a channel")')
    template(slot='title')
      i18n Create a channel

    form(novalidate @submit.prevent='submit')
      label.field
        i18n.label Name
        .c-max-count {{50 - form.length}}
        input.input(
          type='text'
          name='name'
          maxlength='50'
          :class='{ error: $v.form.description.$error }'
          v-model='form.name'
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
          @input='debounceField("description")'
          @blur='updateField("description")'
          v-error:description=''
        )
        i18n.helper This is optional.

      label
        i18n.label Private channel
        input.switch(
          type='checkbox'
        )

      hr

      banner-scoped(ref='formMsg')

      .buttons
        i18n.is-outlined(tag='button' @click='close') Cancel
        i18n.is-danger(
          tag='button'
          @click='submit'
          :disabled='$v.form.$invalid'
        ) Create channel
</template>

<script>
import { validationMixin } from 'vuelidate'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import required from 'vuelidate/lib/validators/required'
import maxLength from 'vuelidate/lib/validators/maxLength'
import BannerSimple from '@components/banners/BannerSimple.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import L from '@view-utils/translations.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'

export default {
  name: 'CreateNewChannelModal',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    ModalTemplate,
    BannerSimple,
    BannerScoped
  },
  data () {
    return {
      form: {
        name: null,
        description: null
      }
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      alert('TODO implement this')
    }
  },
  validations: {
    form: {
      name: {
        [L('This field is required')]: required,
        maxLength: maxLength(50)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
