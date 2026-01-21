<template lang='pug'>
.c-user-settings-tab-container
  .c-back-btn-container
    button.link.c-back-btn(@click.stop='backToMenu')
      i.icon-angle-left.c-back-icon
      i18n Back to menu

  .c-tab-content-wrapper
    | {{ tabId }}
</template>

<script>
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

export default {
  name: 'UserSettingsTabContainer',
  props: {
    tabId: String
  },
  methods: {
    backToMenu () {
      this.$router.push({ name: 'UserSettings' }).catch(logExceptNavigationDuplicated)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-user-settings-tab-container {
  margin-top: 1rem;

  @include desktop {
    margin-top: 3rem;
  }
}

.c-back-btn-container {
  margin-bottom: 2rem;
}

.c-back-btn {
  border-bottom: none;

  .c-back-icon {
    display: inline-block;
    margin-right: 0.375rem;
  }
}
</style>
