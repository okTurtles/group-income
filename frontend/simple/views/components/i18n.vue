<template>
    <component :is="tag">
      {{transformText}}
    </component>
</template>
<script>
export default {
  props: {
    args: [Object, Array],
    tag: {
      type: String,
      default: 'span'
    }
  },
  computed: {
    transformText () {
      const text = this.L(
        this.$slots.default[0].text,
        this.args || {},
        { defaultValue: this.$slots.default[0].text }
      )

      // BUG: Sometimes text is not returned correctly
      // Could not understand why. You can see it happen on
      // 'Pay Group' link on side bar and at /pay-group page - Title: "Pay Group"
      // When that happens, just return the default text.
      if (text) {
        return text
      }

      console.warn('The following i18n text was not translated correctly:', this.$slots.default[0].text)

      return this.$slots.default[0].text
    }
  }
}
</script>
