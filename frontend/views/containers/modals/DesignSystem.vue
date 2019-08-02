<template lang="pug">
modal-template(:class="{ 'has-background': background }")
  template(#title='') Title
  template(#subtitle='' v-if='subtitle') subtitle

  form
    .field
      i18n.label(tag='label') Full name
      input.input(value='Felix Kubin')

    .field
      i18n.label(tag='label') Introduce the potential new member(s) to your group
      textarea(rows='5')
        | {{ L('Felix and Brian are two very important figures in the electronic music scene. They have greatly contributed to the development of genres like ambient music and are now ready to contribute to this group. They are Dreamers like us!') }}

    .buttons
      button(@click.prevent='toggleSubtitle') {{ L('Toggle subtitle') }}
      button(@click.prevent='toggleBackground') {{ L('Toggle background') }}

  template(#footer='')
    i18n(tag='p') According to your voting rules, 8 out of 10 members will have to agree with this.
</template>
<script>
import ModalTemplate from '@components/Modal/ModalTemplate.vue'

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
    }
  }
}
</script>

<style lang="scss" scoped></style>
