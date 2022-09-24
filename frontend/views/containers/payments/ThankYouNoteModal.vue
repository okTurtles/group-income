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
        data-test='memoLabel'
        :args='{ name: from }'
      ) {name} Note:

      .c-note.has-text-bold(data-test='memo') {{ thankYouNote }}
</template>

<script>
import { mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import SvgHello from '@svgs/hello.svg'

export default ({
  name: 'ThankYouNoteModal',
  components: {
    ModalTemplate,
    SvgHello
  },
  computed: {
    ...mapGetters([
      'groupThankYousFrom'
    ]),
    from () {
      return this.$route.query.from || ''
    },
    thankYouNote () {
      const to = this.$route.query.to || ''
      return (this.groupThankYousFrom[this.from] || {})[to]
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

.c-content {
  width: 100%;

  @include tablet {
    max-width: 25rem;
  }
}

.c-note-container {
  width: 100%;
  font-size: $size_4;
  text-align: left;
}

.c-label {
  margin-bottom: 0.25rem;
}
</style>
