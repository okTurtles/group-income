<template lang='pug'>
modal-base-template(class='has-background' :a11yTitle='L("Settings")')
  .wrapper-container
    tab-wrapper(
      :tabNav='settings'
      defaultTab='appearance'
      @close='$emit("close")'
    )
</template>

<script>
import sbp from '@sbp/sbp'
import { SET_MODAL_QUERIES } from '@utils/events.js'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import TabWrapper from '@components/tabs/TabWrapper.vue'
import settings from './settings.js'

export default ({
  name: 'UserSettingsModal',
  components: {
    ModalBaseTemplate,
    TabWrapper
  },
  data () {
    return settings
  },
  created () {
    sbp('okTurtles.events/emit', SET_MODAL_QUERIES, 'UserSettingsModal', { tab: true })
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.wrapper-container {
  height: 100%;
  width: 100%;
  opacity: 1;
  background-color: $general_2;

  @include phone {
    width: calc(100% + 2rem);
  }

  @include tablet {
    width: calc(100% + 3rem);
  }
}
</style>
