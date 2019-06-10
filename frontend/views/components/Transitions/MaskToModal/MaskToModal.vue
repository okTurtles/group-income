<template lang="pug">
  component(:is="tag")
    slot
</template>

<script>
export default {
  name: 'MaskToModal',
  props: {
    tag: {
      type: String,
      default: 'div'
    }
  },
  data () {
    return {
      config: {
        MaskToModal: {
          // Store the dimensions and position of an element (Trigger or Target)
          // so that Masker can access them when it needs to transform
          elementsSpecs: {}, // a Trigger or Target
          updateSpecsOf (el, elementId) {
            const { width, height, top, left } = el.getBoundingClientRect()

            this.elementsSpecs[elementId] = { width, height, top, left }
          }
        }
      }
    }
  },
  provide () {
    return {
      MaskToModal: this.config.MaskToModal
    }
  }
}
</script>
