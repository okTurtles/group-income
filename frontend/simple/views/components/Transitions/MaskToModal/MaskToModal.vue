<template>
  <component :is="tag">
    <slot></slot>
  </component>
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
  },
  provide () {
    return {
      MaskToModal: this.MaskToModal
    }
  }
}
</script>
