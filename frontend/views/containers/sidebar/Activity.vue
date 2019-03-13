<template>
    <menu-parent class="level-right">
      <menu-trigger class="is-icon" :class="{ 'has-text-white': isDarkTheme }">
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

// https://vue-loader.vuejs.org/guide/scoped-css.html#deep-selectors
/deep/ {
  .fa-bell {
    font-size: 0.7rem;
    transform-origin: center 2px;
  }

  .button:hover {
    .fa-bell {
      font-size: 0.7rem;
      animation: bell 750ms forwards;
    }
  }
}

@keyframes bell {
  10% { transform: rotate(15deg); }
  20% { transform: rotate(-15deg); }
  35% { transform: rotate(15deg); }
  60% { transform: rotate(-10deg); }
  80% { transform: rotate(5deg); }
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
import { mapGetters } from 'vuex'
import { List } from '../../components/Lists/index.js'
import { MenuParent, MenuTrigger, MenuContent, MenuHeader, MenuItem } from '../../components/Menu/index.js'

export default {
  name: 'Activity',
  props: {
    activityCount: Number
  },
  computed: {
    ...mapGetters([
      'isDarkTheme'
    ])
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
