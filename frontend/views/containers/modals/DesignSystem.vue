<template lang="pug">
//- NOTE: If you use it as an example when creating other modals
//-       (instead of existing modals), make sure to replace many
//-       of the tags below with their equivalent i18n tags.
modal-template(:class="{ 'has-background': background }")
  template(#title='') Title
  template(#subtitle='' v-if='subtitle') subtitle

  form
    .field
      i18n.label(tag='label') Full name
      input.input(value='Felix Kubin')

    .field
      i18n.label(tag='label') Introduce the potential new member(s) to your group
      //- We aren't using L or i18n here to avoid this example text being
      //- translated by the translators (since it won't appear in the UI)
      textarea(rows='5')
        | Felix and Brian are two very important figures in the electronic music scene. They have greatly contributed to the development of genres like ambient music and are now ready to contribute to this group. They are Dreamers like us!'

    .buttons
      i18n(
        tag='button'
        @click.prevent='toggleSubtitle'
      ) Toggle subtitle
      i18n(
        tag='button'
        @click.prevent='toggleBackground'
      ) Toggle background

      i18n(
        tag='button'
        @click.prevent="openModal('SignUp')"
      ) Open SubModal

  template(#footer='')
    //- We aren't using i18n in this DesignSystem.vue file because
    //- this string shouldn't be translated. However, if you copy this file,
    //- you must change this to be i18n(tag='p')
    p According to your voting rules, 8 out of 10 members will have to agree with this.
</template>
<script>
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'

export default {
  name: 'modal-test',
  data () {
    return {
      type: '',
      subtitle: false,
      background: false
    }
  },
  components: {
    ModalTemplate
  },
  methods: {
    toggleSubtitle () {
      this.subtitle = !this.subtitle
    },
    toggleBackground () {
      this.background = !this.background
    },
    openModal (mode) {
      sbp('okTurtles.events/emit', OPEN_MODAL, mode)
    }
  }
}
</script>

<style lang="scss" scoped></style>
