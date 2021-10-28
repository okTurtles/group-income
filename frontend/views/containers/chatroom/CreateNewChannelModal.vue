<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Create a channel")')
    template(slot='title')
      i18n Create a channel

    form(novalidate @submit.prevent='submit')
      label.field
        i18n.label.c-label-name Name
        .c-max-count(v-if='form.name') {{50 - form.name.length}}
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

      label.c-inline-input
        i18n.label Private channel
        input.switch(
          type='checkbox'
          :value='form.isPrivate'
        )

      hr

      .c-helper
        i(
          :class='`icon-${ form.private ? "lock" : "hashtag" } c-group-i`'
        )

        i18n.helper(
          v-if='form.isPrivate'
          tag='p'
        ) Only added members will have access.

        i18n.helper(
          v-else
          tag='p'
        ) All group members will be added to this channel.

      banner-scoped(ref='formMsg')

      .buttons
        i18n.is-outlined(tag='button' @click='close') Cancel
        i18n.is-success(
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
import BannerScoped from '@components/banners/BannerScoped.vue'
import L from '@view-utils/translations.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'

export default ({
  name: 'CreateNewChannelModal',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    ModalTemplate,
    BannerScoped
  },
  data () {
    return {
      form: {
        name: null,
        description: null,
        isPrivate: false
      }
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    submit () {
      console.log('TODO implement this.')
      this.close()
    }
  },
  validations: {
    form: {
      name: {
        [L('This field is required')]: required,
        maxLength: maxLength(50)
      },
      description: {
        maxLength: maxLength(150)
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
</style>
