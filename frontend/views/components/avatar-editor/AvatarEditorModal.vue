<template lang="pug">
modal-template(
  class='is-centered'
  ref='modal'
  :a11yTitle='L("Edit avatar")'
)
  template(slot='title')
    i18n Edit avatar

  form.c-form(
    @submit.prevent=''
    @keyup.enter='onEnterPressed'
  )
    .c-canvas-container
      canvas.c-canvas(ref='canvas')

    .c-slider-container
      slider-continuous.c-slider(
        :hideOutput='true'
        uid='avatar-zoom'
        :min='1'
        :max='100'
        :value='form.sliderValue'
        @input='onSliderInput'
      )

    i18n.has-text-1(tag='p') Click and drag to reposition

    .buttons
      button.is-outlined(
        type='button'
        @click='close'
      ) Cancel

      button-submit(
        key='save'
        @click='submit'
      ) Save
</template>

<script>
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import SliderContinuous from '@components/SliderContinuous.vue'

export default ({
  name: 'AvatarEditor',
  components: {
    ModalTemplate,
    ButtonSubmit,
    SliderContinuous
  },
  data () {
    return {
      form: {
        sliderValue: 1
      }
    }
  },
  methods: {
    onEnterPressed () {
      alert('TODO!')
    },
    close () {
      this.$refs.modal.close()
    },
    submit () {
      alert('TODO!')
    },
    onSliderInput (e) {
      this.form.sliderValue = e.target.value
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-form {
  max-width: 25rem;
  margin: 0 auto;
}

.c-canvas-container {
  position: relative;
  opacity: 0.7;
  background-color: $general_2;
  height: 15.625rem;
  margin-bottom: 0.5rem;
}
</style>
