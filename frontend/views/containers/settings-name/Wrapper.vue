<template lang='pug'>
modal-base-template
  .wrapper-container
    tab-wrapper(:tabNav='settings')
      tab-item
        settings-user-profile
      tab-item
        tab-placeholder(name='Privacy & Safety')
      tab-item
        tab-placeholder(name='Notifications')
      tab-item
        settings-appearence
      tab-item
        tab-placeholder(name='Changelog')

</template>

<script>
import Settings from '~/frontend/model/settings.js'
import ModalBaseTemplate from '@components/Modal/ModalBaseTemplate.vue'
import TabItem from '@components/Tabs/TabItems.vue'
import TabWrapper from '@components/Tabs/TabWrapper.vue'
import TabPlaceholder from './Placeholder.vue'
import SettingsAppearence from './Appearence.vue'
import SettingsUserProfile from './UserProfile.vue'

export default {
  name: 'SettingsWrapper',

  components: {
    ModalBaseTemplate,
    TabWrapper,
    TabItem,
    SettingsAppearence,
    SettingsUserProfile,
    TabPlaceholder
  },

  data () {
    return Settings
  }
}
</script>

<style lang='scss' scoped>
@import "../../../assets/style/_variables.scss";

.wrapper-container {
  height: 100%;
  width: 100%;
  opacity: 1;

  /deep/ .settings-subtitle {
    margin-bottom: 24px;
    font-weight: bold;
  }

  /deep/ .settings-title {
    display: none;
    font-weight: bold;

    @include tablet {
      display: block;
      top: -2.6rem;
      position: absolute;
    }
  }
}

.settings-container {
  position: relative;
  margin: 0 26px;
  max-width: 620px;
  width: 100%;
}
</style>
