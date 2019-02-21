<template>
    <menu-parent class="level-right">
      <menu-trigger class="is-icon">
        <i class="fa-bell" :class="activityCount ? 'far' : 'fas'"></i>
        <span class="c-badge" v-if="activityCount" data-test="alertNotification">{{ activityCount }}</span>
      </menu-trigger>

      <menu-content class="c-content">
        <menu-header>
          <i18n>Notifications</i18n>
        </menu-header>
        <list hasMargin>
          <menu-item tag="router-link" itemId="hash-3" to="/somewhere-new">
            New member proposal at Dreamers
          </menu-item>
          <menu-item tag="router-link" itemId="hash-3" to="/somewhere-new" hasDivider>
            TODO Design here
          </menu-item>
        </list>
        <div class="has-text-centered c-seeall">
          <router-link to="#activity">See All</router-link>
        </div>
      </menu-content>
    </menu-parent>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-badge {
  position: absolute;
  top: 0;
  right: 0;
  width: $gi-spacer;
  height: $gi-spacer;
  color: $body-background-color;
  background-color: $danger;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 600;
}

.fa-bell {
  font-size: 0.7rem;
}

.c-content {
  left: 2rem;
  width: 15rem;
}

.c-seeall {
  margin-bottom: $gi-spacer-sm;
}
</style>
<script>
import { List } from '../../components/Lists/index.js'
import { MenuParent, MenuTrigger, MenuContent, MenuHeader, MenuItem } from '../../components/Menu/index.js'

export default {
  name: 'Activity',
  props: {
    activityCount: Number
  },
  components: {
    List,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuHeader,
    MenuItem
  }
}
</script>
