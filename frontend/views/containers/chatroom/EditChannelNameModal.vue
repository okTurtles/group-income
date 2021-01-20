<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Rename channel")')
    template(slot='title')
      i18n Rename channel

    form(novalidate @submit.prevent='submit')
      label.field
        i18n.label.c-label-name Name
        .c-max-count(
          v-if='form.name'
          :class='{"is-danger": form.name.length >= 50}'
        ) {{50 - form.name.length}}

        input.input(
          type='text'
          name='name'
          maxlength='50'
          :class='{ error: $v.form.name.$error }'
          v-model='form.name'
          @input='debounceField("name")'
          @blur='updateField("name")'
          v-error:name=''
        )

      banner-scoped(ref='formMsg')

      .buttons
        i18n.is-outlined(tag='button' @click='close') Cancel
        i18n.is-success(
          tag='button'
          @click='submit'
          :disabled='$v.form.$invalid'
        ) Save
</template>

<script>
import sbp from '~/shared/sbp.js'
import { validationMixin } from 'vuelidate'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import required from 'vuelidate/lib/validators/required'
import maxLength from 'vuelidate/lib/validators/maxLength'
import BannerScoped from '@components/banners/BannerScoped.vue'
import L from '@view-utils/translations.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'

export default {
  name: 'EditChannelNameModal',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    ModalTemplate,
    BannerScoped
  },
  data () {
    return {
      channelId: this.$route.query.channel,
      form: {
        name: null
      }
    }
  },
  computed: {},
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      alert('TODO implement this')
      try {
        await sbp('gi.actions/channel/renameChannel', this.form.name)
      } catch (e) {
        console.error('RenameChannelModal submit() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
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

.c-label-name {
  float: left;
}

.c-max-count   {
  float: right;
  color: $text_1;

  &.is-danger {
    color: $danger_0;
  }
}
</style>
