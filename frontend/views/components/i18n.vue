<template lang="pug">
component(
  :is='tag'
  v-on='$listeners'
  v-html='translatedText'
)
</template>

<script>
export default {
  props: {
    args: [Object, Array],
    tag: {
      type: String,
      default: 'span'
    },
    html: [String]
  },
  computed: {
    translatedText () {
      const text = this.html || this.$slots.default[0].text
      const translation = this.L(text, this.args || {}, { defaultValue: text })

      if (translation) {
        return translation
      }

      console.warn('The following i18n text was not translated correctly:', text)

      return text
    }
  }
}
</script>
