<template lang='pug'>
nav.c-navigation(
  :aria-label='L("Main")'
  :class='{ "is-active": ephemeral.isActive }'
)
  toggle(@toggle='toggleMenu' element='navigation' :aria-expanded='ephemeral.isActive')
    badge.c-toggle-badge(v-if='totalUnreadNotificationCount' data-test='dashboardBadge') {{ totalUnreadNotificationCount }}
  groups-list(v-if='groupsByName.length > 1' :inert='isInert')

  .c-navigation-wrapper(:inert='isInert')
    .c-navigation-header
      h1.sr-only Main Menu

      router-link(to='/home')
        img.c-logo(:src='logo' alt='GroupIncome\'s logo')

      notification-bell(data-test='notificationBell')

    .c-navigation-body(
      @click.self='enableTimeTravel'
      v-if='groupsByName.length'
    )
      .c-navigation-body-top
        ul.c-menu-list
          list-item(tag='router-link' icon='columns' to='/dashboard' data-test='dashboard')
            i18n Dashboard
          list-item(tag='router-link' icon='chart-pie' to='/contributions' data-test='contributionsLink')
            i18n Contributions
          list-item(tag='router-link' icon='tag' to='/payments' data-test='paymentsLink')
            i18n Payments
          list-item(tag='router-link' icon='comments' to='/group-chat' :badgeCount='3' data-test='groupChatLink')
            i18n Chat
          list-item(tag='router-link' icon='cog' to='/group-settings' data-test='groupSettingsLink')
            i18n Group Settings

        .c-navigation-separator(v-if='groupsByName.length < 2')
          button(
            class='is-small is-outlined'
            @click='openModal("GroupCreationModal")'
            data-test='createGroup'
            :aria-label='L("Add a group")'
          )
            i.icon-plus.is-prefix
            i18n Add a group

      .c-navigation-bottom
        ul.c-menu-list-bottom
          i18n(
            tag='a'
            :href='ALLOWED_URLS.BLOG_PAGE'
            target='_blank'
            rel='noopener noreferrer'
          ) Blog

          i18n(
            tag='a'
            :href='ALLOWED_URLS.FAQ_PAGE'
            target='_blank'
            rel='noopener noreferrer'
          ) Help &amp; Feedback

          i18n(
            tag='a'
            :href='ALLOWED_URLS.DONATE_PAGE'
            target='_blank'
            rel='noopener noreferrer'
          ) Donate

    .c-navigation-footer(v-if='groupsByName.length')
      profile
  component(:is='ephemeral.timeTravelComponentName')
</template>

<script>
import sbp from '@sbp/sbp'
import Badge from '@components/Badge.vue'
import NotificationBell from '@containers/notifications/NotificationBell.vue'
import GroupsList from './GroupsList.vue'
import Profile from './Profile.vue'
import Toggle from '@components/Toggle.vue'
import ListItem from '@components/ListItem.vue'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import { DESKTOP } from '@view-utils/breakpoints.js'
import { debounce } from '@utils/giLodash.js'

export default ({
  name: 'Navigation',
  components: {
    Badge,
    Toggle,
    NotificationBell,
    GroupsList,
    Profile,
    ListItem
  },
  data () {
    return {
      config: {
        debounceResize: debounce(this.checkIsTouch, 250)
      },
      ephemeral: {
        isActive: false,
        isTouch: null,
        timeTravelComponentName: null
      }
    }
  },
  created () {
    this.checkIsTouch()
  },
  mounted () {
    // TODO - Create a single resize listener to be reused on components
    window.addEventListener('resize', this.config.debounceResize)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.config.debounceResize)
  },
  watch: {
    $route (to, from) {
      const isDifferentPage = from.path !== to.path
      if (this.ephemeral.isActive && isDifferentPage) {
        this.ephemeral.isActive = false
      }
    }
  },
  computed: {
    ...mapGetters([
      'groupsByName',
      'colors',
      'totalUnreadNotificationCount'
    ]),
    logo () {
      const name = this.colors.theme === 'dark' ? '-white' : ''
      return `/assets/images/logo-transparent${name}.png`
    },
    isInert () {
      return !this.ephemeral.isActive && this.ephemeral.isTouch
    }
  },
  methods: {
    toggleMenu () {
      this.ephemeral.isActive = !this.ephemeral.isActive
    },
    openModal (mode) {
      sbp('okTurtles.events/emit', OPEN_MODAL, mode)
    },
    enableTimeTravel (evt) {
      if (evt.shiftKey && process.env.NODE_ENV !== 'production') {
        console.debug('enable time travel!')
        this.ephemeral.timeTravelComponentName = 'TimeTravel'
      }
    },
    checkIsTouch () {
      this.ephemeral.isTouch = window.innerWidth < DESKTOP
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-navigation {
  display: flex;
  flex-direction: row;
  font-weight: normal;
  background: $general_2;
}

.c-navigation-wrapper {
  display: flex;
  flex-direction: column;
  min-width: 14.375rem;
}

.c-navigation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  padding: 0 1rem;
  height: 4.6rem;
  margin-bottom: -0.1rem;
}

.c-navigation-body {
  display: flex;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  flex-direction: column;
  justify-content: space-between;
  flex-grow: 1;
}

.c-navigation-separator {
  text-align: center;
  margin: 1.5rem 1.5rem 0 1.5rem;
  border-top: 1px solid $general_0;
  padding-top: 1.5rem;
}

.c-navigation-bottom {
  padding-top: 2rem;
  padding-bottom: 0.5rem;
}

.c-navigation-footer {
  flex-shrink: 0;
}

.c-menu-list-bottom {
  display: flex;
  flex-direction: column;
  margin-left: 1rem;
  font-size: $size_5;

  a {
    line-height: 1.65rem;
    color: $text_1;

    &:hover,
    &:focus {
      color: $text_0;
      outline: none;
    }
  }
}

.c-logo {
  min-width: 8rem;
  width: 8rem;
}

.c-toggle {
  left: 100%;
}
</style>
