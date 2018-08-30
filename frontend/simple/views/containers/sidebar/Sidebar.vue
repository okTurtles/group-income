<template>
  <header class="c-sidebar is-flex" :class="{ 'is-active': isActive }">
    <button class="gi-is-unstyled c-toggle" @click="toggleMenu">
      <i class="fa fa-bars"></i>
      <img src="/simple/assets/images/logo-transparent.png" alt="GroupIncome's logo" class="gi-logo">
    </button>
    <div class="c-sidebar-header level is-mobile">
      <h1 class="sr-only">Main Menu</h1>
      <router-link to="home">
        <img src="/simple/assets/images/logo-transparent.png" alt="GroupIncome's logo" class="gi-logo level-left">
      </router-link>
      <activity :activityCount="activityCount"></activity>
    </div>

    <div class="c-sidebar-body is-flex is-flex gi-is-justify-between">
      <div class="c-sidebar-body-top">
        <list class="c-toplinks">
          <list-item tag="router-link" to="/mailbox"
            icon="envelope-o"
            data-test="mailboxLink"
            :badgeCount="unreadMessagesCount || activityCount">
              <i18n>Inbox</i18n>
          </list-item>
        </list>

        <groups-list></groups-list>
      </div>

      <div class="c-sidebar-body-bottom">
        <list>
          <list-item tag="a" icon="external-link-square" variant="secondary" href="https://groupincome.org/blog/" target="_blank">
              <i18n>Blog</i18n>
          </list-item>
          <list-item tag="a" icon="question-circle" variant="secondary" href="https://groupincome.org/faq/" target="_blank">
              <i18n>Help & Feedback</i18n>
          </list-item>
          <list-item tag="a" icon="heart" variant="secondary" href="https://groupincome.org/donate/" target="_blank">
              <i18n>Donate</i18n>
          </list-item>
        </list>

        <profile></profile>
      </div>
    </div>
  </header>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

$speed: 300ms;

.c-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: $gi-sidebarWidth;
  height: 100vh;
  z-index: 10;
  flex-direction: column;
  // background: linear-gradient(210deg, rgba($primary, 0.15), $body-background-color 20rem); // diagonal gradient
  // background: linear-gradient(-90deg, $primary-bg-s, $body-background-color 15rem); // 90deg linear gradient
  background: $primary-bg-s; // solid

  @include mobile {
    transform: translateX(-100%);
    transition: transform $speed;

    &.is-active {
      transform: translateX(0);
    }
  }

  @include tablet {
    width: $gi-sidebarWidth;
  }

  &-header {
    padding: $gi-spacer*1.5 $gi-spacer 0;
  }

  &-body {
    padding: 0 $gi-spacer $gi-spacer;
    overflow: auto;
    flex-direction: column;
    flex-grow: 1;

    &-bottom {
      padding-top: $gi-spacer-lg;
    }
  }
}

.c-toggle {
  @include mobile {
    position: absolute;
    top: $gi-spacer*1.5;
    left: calc(100% + #{$gi-spacer});
    width: 100vw;
    text-align: left;
    background-color: transparent;
    transition: height 1ms $speed;

    .gi-logo {
      margin-left: $gi-spacer-sm;
    }

    .gi-logo,
    .fa-bars {
      transition: opacity $speed/5 $speed*1.1;
    }

    .is-active & {
      background-color: rgba(0, 0, 0, 0.7);
      height: 100%;
      top: 0;
      left: 100%;
      transition: height 1ms 1ms;

      .gi-logo,
      .fa-bars {
        transition: opacity 1ms 1ms;
        opacity: 0;
      }
    }
  }

  @include tablet {
    display: none;
  }
}

.c-toplinks {
  margin-bottom: $gi-spacer;
}
</style>
<script>
import Activity from './Activity.vue'
import GroupsList from './GroupsList.vue'
import Profile from './Profile.vue'
import { List, ListItem } from '../../components/Lists/index.js'

export default {
  name: 'SideBar',
  components: {
    Activity,
    GroupsList,
    Profile,
    List,
    ListItem
  },
  data () {
    return {
      isActive: false
    }
  },
  computed: {
    activityCount () {
      // TODO: activityCount should really count unreadMessageCount?
      return this.$store.getters.unreadMessageCount || this.$store.getters.proposals.length
    },
    unreadMessagesCount () {
      return this.$store.getters.unreadMessageCount
    }
  },
  methods: {
    toggleMenu () {
      this.isActive = !this.isActive
    }
  }
}
</script>
