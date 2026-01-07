<template lang='pug'>
.c-group-settings-tab-container
  div Current tab ID: {{ tabId }}
  button.link(@click.stop='backToMenu') Back to menu
</template>

<script>
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

export default {
  name: 'GroupSettingsTabContainer',
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
  margin-top: 3rem;
}
</style>
