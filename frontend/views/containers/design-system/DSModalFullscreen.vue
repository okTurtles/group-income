<template lang="pug">
modal-base-template(:class='{ "has-background": background }' :a11yTitle='L("Modal title")')
  .wrapper-container
    .example-header
      h2.is-title-2 Modal base example

    .example-container

      form
        .field
          i18n.label(tag='label') Full name
          input.input(value='Felix Kubin')

        .field
          i18n.label(tag='label') Introduce the potential new member(s) to your group
          textarea.textarea(rows='5')
            | Felix and Brian are two very important figures in the electronic music scene. They have greatly contributed to the development of genres like ambient music and are now ready to contribute to this group. They are Dreamers like us!'

        .buttons
          i18n(
            tag='button'
            @click.prevent='toggleBackground'
          ) Toggle background

          i18n(
            tag='button'
            @click.prevent='openModal("DSModalNested")'
          ) Open Modal
</template>

<script>
import {
  sbp,
  OPEN_MODAL
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'

export default ({
  name: 'ModalDSNestedExample',
  components: {
    ModalBaseTemplate
  },
  data () {
    return {
      background: false
    }
  },
  methods: {
    toggleBackground () {
      this.background = !this.background
    },
    openModal (mode) {
      sbp('okTurtles.events/emit', OPEN_MODAL, mode)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.wrapper-container {
  height: 100%;
  width: 100%;
  background-color: $general_2;
}

.example-header,
.example-container {
  @include tablet {
    margin: 0 auto;
    max-width: 620px;
  }
}

.example-header {
  display: flex;
  height: 4.75rem;
  width: 100%;
  padding-left: 2rem;
  padding-top: 2rem;
}

.has-background .example-header {
  justify-content: center;
  align-items: center;
  padding-top: 0;
  background-color: $background_0;

  @include tablet {
    padding-top: 2rem;
    justify-content: flex-start;
    background-color: transparent;
  }
}

form {
  padding: 2rem;
}
</style>
