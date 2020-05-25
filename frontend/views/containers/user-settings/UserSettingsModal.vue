<template lang='pug'>
modal-base-template(class='has-background' :a11yTitle='L("Settings")')
  .wrapper-container
    tab-wrapper(
      :title='L("Settings")'
      :tabNav='settings'
      defaultTab='my-account'
      @close='$emit("close")'
    )

</template>

<script>
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import TabWrapper from '@components/tabs/TabWrapper.vue'
import settings from './settings.js'

export default {
  name: 'SettingsWrapper',
  components: {
    ModalBaseTemplate,
    TabWrapper
  },
  data () {
    return settings
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.wrapper-container {
  height: 100%;
  width: 100%;
  opacity: 1;
  background-color: $general_2;
}

.settings-container {
  position: relative;
  margin: 0 1.5rem;
  width: 100%;
  max-width: 38rem;
}
</style>
