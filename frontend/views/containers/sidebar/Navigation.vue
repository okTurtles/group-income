<template lang="pug">
nav.c-navigation(
  role='navigation'
  :class="{ 'is-active': ephemeral.isActive }"
)
  toggle(@toggle='toggleMenu')
  .c-navigation-header
    h1.sr-only Main Menu

    router-link(to='/home')
      img.c-logo(:src='logo' alt='GroupIncome\'s logo')

    // NOTE/REVIEW: If we follow Messages GIBot approach, the bell icon wont be needed
    activity(:activityCount='activityCount')

  .c-navigation-body
    .c-navigation-body-top
      ul.c-top-links
        list-item(
          tag='router-link'
          to='/messages'
          icon='envelope'
          :class="`has-text-${isDarkTheme ? 'white' : 'dark'}`"
          :badgeCount='2'
        )
          i18n Messages

      groups-list.c-group-list

      // Keep it here atm until we remove completly the mailbox
      list-item(
        tag='router-link'
        to='/mailbox'
        style='opacity: 0; cursor: default;'
        icon='envelope'
        data-test='mailboxLink'
        :badgeCount='unreadMessagesCount || activityCount'
      )
        i18n Inbox (deprecated)

    .c-navigation-body-bottom
      ul
        list-item(
          tag='a'
          variant='secondary'
          href='https://groupincome.org/blog/'
          target='_blank'
        )
          i18n(:class="isDarkTheme ? 'has-text-light-grey' : ''") Blog

        list-item(
          tag='a'
          variant='secondary'
          href='https://groupincome.org/faq/'
          target='_blank'
        )
          i18n(:class="isDarkTheme ? 'has-text-light-grey' : ''") Help &amp; Feedback

        list-item(
          tag='a'
          variant='secondary'
          href='https://groupincome.org/donate/'
          target='_blank'
        )
          i18n(:class="isDarkTheme ? 'has-text-light-grey' : ''") Donate
      profile
</template>

<script>
import Activity from './Activity.vue'
import GroupsList from './GroupsList.vue'
import Profile from './Profile.vue'
import Toggle from './Toggle.vue'
import ListItem from '@components/ListItem.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'SideBar',
  components: {
    Toggle,
    Activity,
    GroupsList,
    Profile,
    ListItem
  },
  data () {
    return {
      ephemeral: {
        isActive: false
      }
    }
  },
  computed: {
    ...mapGetters([
      'isDarkTheme'
    ]),
    activityCount () {
      // TODO: activityCount should really count unreadMessageCount?
      return this.$store.getters.unreadMessageCount
    },
    unreadMessagesCount () {
      return this.$store.getters.unreadMessageCount
    },
    logo () {
      const name = this.$store.getters.colors.theme === 'dark' ? '-white' : ''
      return `/assets/images/logo-transparent${name}.png`
    }
  },
  methods: {
    toggleMenu () {
      this.ephemeral.isActive = !this.ephemeral.isActive
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-navigation {
  display: flex;
  flex-direction: column;
  font-weight: normal;
  background: $primary-bg-s; // solid
}

.c-navigation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 $spacer-sm 0 $spacer;
  height: $spacer-xl;
}

.c-navigation-body {
  display: flex;
  overflow: auto;
  justify-content: space-between;
  flex-direction: column;
  flex-grow: 1;
}

.c-navigation-bottom {
  padding-top: $spacer-lg;
}

.c-logo {
  min-width: 8rem;
  width: 8rem;
}

.c-group-list {
  padding-top: 1rem;
  padding-bottom: 0.8rem;
  background-color: $primary-bg-a;
}

.c-toggle {
  left: 100%;
  height: 64px;

  @include tablet {
    display: none;
  }
}

.c-top-links {
  margin-bottom: $spacer-sm;
}
</style>
