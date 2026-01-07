<template lang='pug'>
.c-group-settings-tab-container
  .c-back-btn-container
    button.link.c-back-btn(@click.stop='backToMenu')
      i.icon-angle-left.c-back-icon
      i18n Back to menu

  .c-tab-content-wrapper
    update-group-profile
</template>

<script>
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'
import UpdateGroupProfile from './UpdateGroupProfile.vue'

export default {
  name: 'GroupSettingsTabContainer',
  components: {
    UpdateGroupProfile
  },
  props: {
    tabId: String
  },
  methods: {
    backToMenu () {
      this.$router.push({ name: 'GroupSettingsNew' }).catch(logExceptNavigationDuplicated)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-group-settings-tab-container {
  margin-top: 1rem;

  @include desktop {
    margin-top: 3rem;
  }
}

.c-back-btn-container {
  margin-bottom: 3rem;
}

.c-back-btn {
  border-bottom: none;

  .c-back-icon {
    display: inline-block;
    margin-right: 0.375rem;
  }
}
</style>
