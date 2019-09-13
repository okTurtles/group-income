<template lang="pug">
modal-base-template(:class="{ 'has-background': background }")
  .wrapper-container
    .example-header
      h2 Modal base example

    .example-container

      form
        .field
          i18n.label(tag='label') Full name
          input.input(value='Felix Kubin')

        .field
          i18n.label(tag='label') Introduce the potential new member(s) to your group
          textarea(rows='5')
            | Felix and Brian are two very important figures in the electronic music scene. They have greatly contributed to the development of genres like ambient music and are now ready to contribute to this group. They are Dreamers like us!'

        .buttons
          i18n(
            tag='button'
            @click.prevent='toggleBackground'
          ) Toggle background

          i18n(
            tag='button'
            @click.prevent="openModal('DesignSystemModal')"
          ) Open Modal

</template>
<script>
import ModalBaseTemplate from '@components/Modal/ModalBaseTemplate.vue'
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'

export default {
  name: 'modal-base-test',
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
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

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
  padding-left: $spacer-lg;
  padding-top: $spacer-lg;
}

.has-background .example-header {
  justify-content: center;
  align-items: center;
  padding-top: 0;
  background-color: $background_0;

  @include tablet {
    padding-top: $spacer-lg;
    justify-content: flex-start;
    background-color: transparent;
  }
}

form {
  padding: $spacer-lg;
}
</style>
