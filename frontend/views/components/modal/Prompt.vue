<template lang='pug'>
modal-template(ref='modal' class='is-prompt' :a11yTitle='$attrs.heading' :modalForceAction='true')
  template(#title='') {{ $attrs.heading }}
  template(#subtitle='' v-if='$attrs.subtitle') {{ $attrs.subtitle }}

  .c-container
    form(
      @submit.prevent=''
      novalidate='true'
    )
      fieldset.field.c-prompt-content(:class='{ "is-text-center": isContentCentered }')
        legend.label(v-safe-html:a='$attrs.question')

      .buttons
        button.is-outlined(
          v-if='$attrs.secondaryButton'
          type='button'
          @click='closeModal'
        ) {{ $attrs.secondaryButton || L('No')}}

        button-submit(
          v-if='$attrs.primaryButton'
          :class='"is-" + primaryButtonStyle'
          @click='submit'
          data-test='submitPrompt'
        ) {{ $attrs.primaryButton || L('Yes')}}
</template>

<script>
import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { MODAL_RESPONSE } from '@utils/events.js'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'

export default ({
  name: 'Prompt',
  components: {
    ModalTemplate,
    ButtonSubmit,
    L
  },
  props: {
    primaryButtonStyle: {
      type: String,
      default: 'outlined'
    },
    isContentCentered: {
      type: Boolean,
      default: true
    }
  },
  mounted () {
    if (Object.keys(this.$attrs).length === 0) this.closeModal()
  },
  methods: {
    closeModal () {
      sbp('okTurtles.events/emit', MODAL_RESPONSE, false)
      this.$refs.modal.unload('Prompt')
    },
    submit () {
      sbp('okTurtles.events/emit', MODAL_RESPONSE, true)
      this.$refs.modal.unload('Prompt')
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  width: 100%;

  .buttons {
    justify-content: center;

    button:not(:last-child) {
      margin-right: 1.375rem;
    }
  }

  .c-prompt-content {
    position: relative;

    &.is-text-center {
      text-align: center;
    }

    legend.label {
      margin: 0 auto 0.5rem auto;
    }
  }
}

::v-deep .c-modal-header {
  max-width: 37rem;
  align-self: center;
  text-align: center;

  h1 {
    padding: 1.2rem 0;
  }
}
</style>
