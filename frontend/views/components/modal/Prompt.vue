<template lang='pug'>
modal-template(ref='modal' :a11yTitle='$attrs.heading' :modalForceAction='true')
  template(#title='') {{ $attrs.heading }}
  template(#subtitle='' v-if='$attrs.subtitle') {{ $attrs.subtitle }}

  .c-container
    form(
      @submit.prevent=''
      novalidate='true'
    )
      fieldset.field
        legend.label
          | {{ $attrs.question }}

      .buttons
        button.is-outlined(type='button' @click='closeModal') {{ $attrs.noButton || L('No')}}
        button-submit.is-success(
          @click='submit'
          data-test='submitPrompt'
        ) {{ $attrs.yesButton || L('Yes')}}
</template>

<script>
import L from '@view-utils/translations.js'
import { MODAL_RESPONSE } from '@utils/events.js'
import sbp from '~/shared/sbp.js'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'

export default ({
  name: 'Prompt',
  components: {
    ModalTemplate,
    ButtonSubmit
  },
  mounted () {
    if (Object.keys(this.$attrs).length === 0) this.closeModal()
  },
  methods: {
    closeModal () {
      sbp('okTurtles.events/emit', MODAL_RESPONSE, false)
      this.$refs.modal.close()
    },
    submit () {
      sbp('okTurtles.events/emit', MODAL_RESPONSE, true)
      this.$refs.modal.close()
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  width: 100%;
}
</style>
