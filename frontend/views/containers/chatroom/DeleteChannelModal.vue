<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Delete channel")')
    template(slot='title')
      i18n Delete channel

    form(novalidate @submit.prevent='submit' data-test='deleteGroup')
      i18n(
        tag='strong'
        :args='{ name: groupSettings.groupName }'
      ) Are you sure you want to delete {name}?

      ul.c-list
        i18n.c-list-item(tag='li') All messages will be deleted;
        i18n.c-list-item(tag='li') Members will be removed from the channel;
        i18n.c-list-item(tag='li') This channel will no longer be visible.

      banner-simple.c-banner(severity='danger')
        i18n(
          :args='LTags("strong")'
        ) This action {strong_}cannot be undone{_strong}.

      label.checkbox
        input.input(type='checkbox' name='confirmation' v-model='form.confirmation')
        i18n(:args='{ name: groupSettings.groupName, ...LTags("span") }') Yes, I want to {span_}delete {name} permanently{_span}.

      banner-scoped(ref='formMsg')

      .buttons
        i18n.is-outlined(tag='button' @click='close') Cancel
        button-submit.is-danger(
          @click='submit'
          :disabled='$v.form.$invalid'
          data-test='btnSubmit'
          ) {{ L('Delete channel') }}
</template>

<script>
import sbp from '~/shared/sbp.js'
import { validationMixin } from 'vuelidate'
import { mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import BannerSimple from '@components/banners/BannerSimple.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import L from '@view-utils/translations.js'

export default {
  name: 'DeleteChannelModal',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    ModalTemplate,
    BannerSimple,
    BannerScoped,
    ButtonSubmit
  },
  data () {
    return {
      channelId: this.$route.query.channel,
      form: {
        confirmation: false
      }
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings'
    ])
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      if (this.$v.form.$invalid) { return }

      try {
        // TODO
        await sbp('gi.actions/channel/removeChannel', this.channelId)
      } catch (e) {
        console.error('RemoveChannelModal submit() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
    }
  },
  validations: {
    form: {
      confirmation: {
        [L('Please confirm that you want to delete this channel')]: value => value === true
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-banner {
  margin: 1.5rem 0 1rem 0;

  ::v-deep strong {
    color: $danger_0;
  }
}

.c-list{
  padding-top: .5rem;

  .c-list-item {
    list-style: initial;
    margin: .5rem 1rem;
  }
}
</style>
