<template lang="pug">
modal-template(
  class='is-centered'
  ref='modal'
  data-test='AvatarEditorModal'
  :a11yTitle='L("Edit avatar")'
)
  template(slot='title')
    i18n Edit avatar

  input.sr-only(
    ref='replacePhotoInput'
    type='file'
    name='load-photo'
    accept='image/*'
    @change='loadPhotoChange($event.target.files)'
    data-test-id='replacePhotoInput'
  )

  form.c-form(@submit.prevent='')
    editor-canvas.c-canvas-container(
      :key='ephemeral.canvasComponentKey'
      ref='editorCanvas'
      :zoom='zoom'
      :imageUrl='ephemeral.replaceImageUrl'
      @pointer-wheel='HandleWheelOnCanvas'
      @pinch-in='decrementSlider(4)'
      @pinch-out='incrementSlider(4)'
    )

    .c-slider-container
      button.is-icon-small(@pointerdown='decrementSlider()')
        i.icon-magnifying-minus

      slider-continuous.c-slider(
        :key='ephemeral.canvasComponentKey + "-slider"'
        ref='slider'
        :hideText='true'
        uid='avatar-zoom'
        :min='config.sliderMin'
        :max='config.sliderMax'
        :value='form.slider'
        @input='onSliderInput'
      )

      button.is-icon-small(@pointerdown='incrementSlider()')
        i.icon-magnifying-plus

    i18n.has-text-1.hide-touch-device(tag='p') Click and drag to reposition
    i18n.has-text-1.hide-hoverable-device(tag='p') Pinch to zoom, drag to reposition

    .buttons
      i18n.is-outlined(
        tag='button'
        @click='onReplacePhotoClick'
      ) Replace photo

      button-submit(
        key='save'
        data-test='saveBtn'
        @click='submit'
      )
        i18n Save
</template>

<script>
import sbp from '@sbp/sbp'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import SliderContinuous from '@components/SliderContinuous.vue'
import EditorCanvas from './EditorCanvas.vue'
import { linearScale, randomHexString } from 'turtledash'
import { AVATAR_EDITED } from '@utils/events.js'
import { ZOOM_SLIDER_MIN, ZOOM_SLIDER_MAX, IMAGE_SCALE_MIN, IMAGE_SCALE_MAX } from './avatar-editor-constants.js'

const zoomCalculator = linearScale([ZOOM_SLIDER_MIN, ZOOM_SLIDER_MAX], [IMAGE_SCALE_MIN, IMAGE_SCALE_MAX])
/*
  e.g)
  if const zoomCalculator = linearScale([0, 100], [1, 5]),

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
        sliderMin: ZOOM_SLIDER_MIN,
        sliderMax: ZOOM_SLIDER_MAX
      },
      form: {
        slider: ZOOM_SLIDER_MIN
      },
      ephemeral: {
        replaceImageUrl: '',
        // 'canvasComponentKey' below is updated every time a new image is loaded and is used to destory/re-render the children components.
        canvasComponentKey: randomHexString(10)
      }
    }
  },
  computed: {
    zoom () {
      return zoomCalculator(this.form.slider)
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    onReplacePhotoClick () {
      this.$refs.replacePhotoInput.click()
    },
    submit () {
      const blob = this.$refs.editorCanvas.extractEditedImage()
      sbp('okTurtles.events/emit', AVATAR_EDITED, { blob, avatarType: this.$route.query.avatarType || '' })

      this.close()
    },
    onSliderInput (e) {
      this.form.slider = parseFloat(e.target.value)
    },
    incrementSlider (incVal = 1) {
      this.form.slider = Math.min(ZOOM_SLIDER_MAX, this.form.slider + incVal)
      this.$refs.slider.updateSlider(this.form.slider)
    },
    decrementSlider (decVal = 1) {
      this.form.slider = Math.max(ZOOM_SLIDER_MIN, this.form.slider - decVal)
      this.$refs.slider.updateSlider(this.form.slider)
    },
    HandleWheelOnCanvas ({ deltaY }) {
      if (deltaY < 0) this.incrementSlider(3)
      else this.decrementSlider(3)
    },
    loadPhotoChange (fileList) {
      if (!fileList.length) return

      if (this.ephemeral.replaceImageUrl) {
        // if there is an objectURL previously created,
        // make sure to destroy it before renewing it for better app performance.
        URL.revokeObjectURL(this.ephemeral.replaceImageUrl)
      }
      this.ephemeral.replaceImageUrl = URL.createObjectURL(fileList[0])
      this.form.slider = ZOOM_SLIDER_MIN // init the slider zoom value before re-rendering components
      this.ephemeral.canvasComponentKey = randomHexString(10)
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
