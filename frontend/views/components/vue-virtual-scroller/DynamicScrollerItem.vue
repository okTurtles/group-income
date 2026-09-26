<template lang="pug">
div
  slot
</template>

<script>
export default {
  name: 'DynamicScrollerItem',
  props: {
    item: {
      required: true
    },

    watchData: {
      type: Boolean,
      default: false
    },

    /**
     * Indicates if the view is actively used to display an item.
     */
    active: {
      type: Boolean,
      required: true
    },

    index: {
      type: Number,
      default: undefined
    },

    sizeDependencies: {
      type: [Array, Object],
      default: null
    },

    emitResize: {
      type: Boolean,
      default: false
    },

    tag: {
      type: String,
      default: 'div'
    }
  }
}
</script>
