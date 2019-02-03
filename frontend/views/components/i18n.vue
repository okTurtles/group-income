<template>
    <component :is="tag" v-on="$listeners">
      {{translatedText()}}
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
  methods: {
    translatedText () {
      const text = this.L(
        this.$slots.default[0].text,
        this.args || {},
        { defaultValue: this.$slots.default[0].text }
      )

      if (text) {
        return text
      }

      console.warn('The following i18n text was not translated correctly:', this.$slots.default[0].text)

      return this.$slots.default[0].text
    }
  }
}
</script>
