<template lang='pug'>
div
  h1.is-title-1(data-test='privacyStep')
    i18n Privacy Settings

  p
    i18n
      | This step is to be designed. What group privacy settings would you feel more comfortable having control over? Let us know at dunno@groupincome.org!
</template>

<script>
export default ({
  name: 'GroupPrivacy',
  props: {
    group: { type: Object }
  },
  mounted () {
    this.$emit('focusref', 'next')
  }
}: Object)
</script>
