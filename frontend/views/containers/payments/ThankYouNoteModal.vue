<template lang="pug">
modal-template(
  :a11yTitle='L("View Thank You Modal")'
  ref='modal'
)
  template(slot='title')
    i18n Thank you note!

  .c-content
    .c-svg-container
      svg-hello.c-svg

    .c-note-container
      i18n.has-text-1.c-label(
        :args='{ name }'
      ) {name} Note:

      .c-note.has-text-bold
        | Thank you for your contribution! It’s going to be super helpful for my programming lessons.
</template>

<script>
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import SvgHello from '@svgs/hello.svg'

export default ({
  name: 'ThankYouNoteModal',
  components: {
    ModalTemplate,
    SvgHello
  },
  computed: {
    name () {
      return 'fake-user-1'
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-svg-container {
  text-align: center;
  margin-bottom: 1.375rem;
}

.c-note-container {
  font-size: $size_4;
}

.c-label {
  margin-bottom: 0.25rem;
}
</style>
