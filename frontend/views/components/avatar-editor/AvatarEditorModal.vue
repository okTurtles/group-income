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
    editor-canvas.c-canvas-container(:zoom='zoom')

    .c-slider-container
      button.is-icon-small(@pointerdown='decrementSlider')
        i.icon-magnifying-minus

      slider-continuous.c-slider(
        ref='slider'
        :hideText='true'
        uid='avatar-zoom'
        :min='config.sliderMin'
        :max='config.sliderMax'
        :value='form.slider'
        @input='onSliderInput'
      )

      button.is-icon-small(@pointerdown='incrementSlider')
        i.icon-magnifying-plus

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
import EditorCanvas from './EditorCanvas.vue'
import { linearScale } from '@model/contracts/shared/giLodash.js'

const SLIDER_MIN = 0
const SLIDER_MAX = 100
const ZOOM_MIN = 1
const ZOOM_MAX = 3
const zoomCalculator = linearScale([SLIDER_MIN, SLIDER_MAX], [ZOOM_MIN, ZOOM_MAX])
/*
  e.g)
  if SLIDER_MIN = 0, SLIDER_MAX = 100, ZOOM_MIN = 1, ZOOM_MAX = 5,

  zoomCalculator(0) => 1,
  zoomCalculator(100) => 5,
  zoomCalculator(50) => 3 which is 1 + (5 - 1) * 0.5,
  zoomCalculator(25) => 2 which is 1 + (5 - 1) * 0.25,
*/

export default ({
  name: 'AvatarEditor',
  components: {
    ModalTemplate,
    ButtonSubmit,
    SliderContinuous,
    EditorCanvas
  },
  data () {
    return {
      config: {
        sliderMin: SLIDER_MIN,
        sliderMax: SLIDER_MAX
      },
      form: {
        slider: SLIDER_MIN
      }
    }
  },
  computed: {
    zoom () {
      return zoomCalculator(this.form.slider)
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
      this.form.slider = parseFloat(e.target.value)
    },
    incrementSlider () {
      this.form.slider = Math.min(SLIDER_MAX, this.form.slider + 1)
      this.$refs.slider.updateSlider(this.form.slider)
    },
    decrementSlider () {
      this.form.slider = Math.max(SLIDER_MIN, this.form.slider - 1)
      this.$refs.slider.updateSlider(this.form.slider)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-form {
  max-width: 25rem;
  width: 100%;
  margin: 0 auto;
}

.c-canvas-container {
  position: relative;
  opacity: 0.7;
  height: 15.625rem;
  margin-bottom: 0.5rem;
}

.c-slider-container {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.buttons {
  margin-top: 2rem;
}

.c-slider {
  flex-grow: 1;

  ::v-deep .marks {
    margin-top: -0.5rem;
  }
}
</style>
