<template lang='pug'>
ModalSimpleTemplate(ref='modal')
  .c-prompt-body
    h2.is-title-2.c-prompt-heading Prompt title
    p.c-prompt-content
      | Prompt content line 1 bla bla bla bla
      br
      | Prompt content line 1 bla bla bla bla

    .c-buttons-container
      i18n.is-outlined(tag='button') No
      i18n(tag='button') Yes
</template>

<script>
import ModalSimpleTemplate from './ModalSimpleTemplate.vue'

export default {
  name: 'Prompt',
  components: {
    ModalSimpleTemplate
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-prompt-body {
  position: relative;
  display: block;
  width: 100%;

  .c-prompt-heading {
    text-align: left;
    margin-bottom: 2rem;

    @include tablet {
      text-align: center;
    }
  }

  .c-prompt-content {
    text-align: center;
    margin-bottom: 2rem;
  }

  .c-buttons-container {
    position: relative;
    display: flex;
    align-items: center;
    column-gap: 1.25rem;
    justify-content: center;
  }
}
</style>
