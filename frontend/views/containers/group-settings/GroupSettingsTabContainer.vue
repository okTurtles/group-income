<template lang='pug'>
.c-group-settings-tab-container
  .c-back-btn-container
    button.link.c-back-btn(@click.stop='backToMenu')
      i.icon-angle-left.c-back-icon
      i18n Back to menu

  .c-tab-content-wrapper
    component(:is='componentToRender')
</template>

<script>
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'
import UpdateGroupProfile from './UpdateGroupProfile.vue'
import UpdateGroupCurrency from './UpdateGroupCurrency.vue'
import InvitationsTable from './InvitationsTable.vue'
import RolesAndPermissions from './roles-and-permissions/RolesAndPermissions.vue'
import GroupRulesSettings from './GroupRulesSettings.vue'

export default {
  name: 'GroupSettingsTabContainer',
  props: {
    tabId: String
  },
  computed: {
    componentToRender () {
      return ({
        'group-profile': UpdateGroupProfile,
        'group-currency': UpdateGroupCurrency,
        'roles-and-permissions': RolesAndPermissions,
        'invite-links': InvitationsTable,
        'voting-rules': GroupRulesSettings
      })[this.tabId]
    }
  },
  methods: {
    backToMenu () {
      this.$router.push({ name: 'GroupSettings' }).catch(logExceptNavigationDuplicated)
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
