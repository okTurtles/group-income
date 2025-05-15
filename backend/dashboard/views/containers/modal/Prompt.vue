<template lang='pug'>
ModalSimpleTemplate(
  ref='modal'
  variant='prompt'
  :hideCloseButton='hideCloseButton'
)
  .c-prompt-body
    h2.is-title-2.c-prompt-heading(v-safe-html='title')
    p.c-prompt-content(v-safe-html='content')

    .c-buttons-container(v-if='primaryButton || secondaryButton')
      button.is-outlined(
        type='button'
        @click.stop='onCtaClick("secondary")'
      ) {{ secondaryButton }}
      button(
        type='button'
        @click.stop='onCtaClick("primary")'
      ) {{ primaryButton }}
</template>

<script>
import sbp from '@sbp/sbp'
import { CLOSE_PROMPT, PROMPT_RESPONSE } from '@view-utils/events.js'
import { PROMPT_ACTIONS } from '@view-utils/constants.js'
import ModalSimpleTemplate from './ModalSimpleTemplate.vue'

export default {
  name: 'Prompt',
  components: {
    ModalSimpleTemplate
  },
  props: {
    title: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    primaryButton: {
      type: String,
      required: false
    },
    secondaryButton: {
      type: String,
      required: false
    },
    hideCloseButton: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    onCtaClick (type = '') {
      const promptAction = ({
        'primary': PROMPT_ACTIONS.PRIMARY,
        'secondary': PROMPT_ACTIONS.SECONDARY
      })[type]

      this.$refs.modal.close(() => {
        sbp('okTurtles.events/emit', PROMPT_RESPONSE, promptAction)
        sbp('okTurtles.events/emit', CLOSE_PROMPT)
      })
    }
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
