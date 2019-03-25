<template lang='pug'>
modal-base-template
  .wrapper-container
    tab-wrapper(:tabNav='settings' v-model='activeTab')
      tab-item
        tab-placeholder(name='My account')
      tab-item
        tab-placeholder(name='Privacy & Safety')
      tab-item
        tab-placeholder(name='Notifications')
      tab-item
        settings-appearence
      tab-item
        tab-placeholder(name='Changelog')
      tab-item
        tab-placeholder(name='Log Out')

</template>

<script>
import ModalBaseTemplate from '../../components/Modal/ModalBaseTemplate.vue'
import TabItem from '../../components/Tabs/TabItems.vue'
import TabWrapper from '../../components/Tabs/TabWrapper.vue'
import TabPlaceholder from './placeholder.vue'
import SettingsAppearence from './Appearence.vue'
import Settings from '../../../model/settings.js'

export default {
  name: 'SettingsWrapper',

  components: {
    ModalBaseTemplate,
    TabWrapper,
    TabItem,
    SettingsAppearence,
    TabPlaceholder
  },

  data () {
    return Settings
  }
}
</script>

<style lang='scss' scoped>
@import "../../../assets/sass/theme/index";

.wrapper-container {
  height: 100%;
  width: 100%;
  opacity: 1;

  /deep/ .settings-title {
    margin: 9px 0 24px 0;
    font-weight: bold;

    @include phone {
      margin: 14px 0 24px 28px;
    }
  }

  /deep/ .settings-subtitle {
    margin-bottom: 24px;
    font-weight: bold;
  }
}

.settings-container {
  padding-left: 26px;
}
</style>
