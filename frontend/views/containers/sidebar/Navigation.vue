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

  // TODO reintegrate group list once design is approuved
  //- groups-list.c-group-list

  .c-navigation-body(
    @click.self='enableTimeTravel'
  )
    .c-navigation-body-top
      ul.c-menu-list
        // TODO/BUG: Mobile - hide navbar after going to a page
        list-item(tag='router-link' icon='columns' to='/dashboard')
          i18n Dashboard
        list-item(tag='router-link' icon='chart-pie' to='/contributions')
          i18n Contributions
        list-item(tag='router-link' icon='tag' to='/pay-group')
          i18n Pay Group
        list-item(tag='router-link' icon='comments' to='/group-chat' :badgeCount='3')
          i18n Chat
        list-item(tag='router-link' icon='cog' to='/group-settings')
          i18n Group Settings

        // Keep it here atm until we remove completly the mailbox
        list-item(
          tag='router-link'
          to='/messages'
          style='opacity: 0; cursor: default;'
          icon='envelope'
          :badgeCount='2'
        )
          i18n Messages

        list-item(
          tag='router-link'
          to='/mailbox'
          style='opacity: 0; cursor: default;'
          icon='envelope'
          data-test='mailboxLink'
          :badgeCount='unreadMessageCount || activityCount'
        )
          i18n Inbox (deprecated)

    .c-navigation-body-bottom
      ul.c-menu-list-bottom
        i18n(
          tag='a'
          href='https://groupincome.org/blog/'
          target='_blank'
        ) Blog

        i18n(
          tag='a'
          href='https://groupincome.org/faq/'
          target='_blank'
        ) Help &amp; Feedback

        i18n(
          tag='a'
          href='https://groupincome.org/donate/'
          target='_blank'
        ) Donate

      profile

  component(:is='ephemeral.timeTravelComponentName')
</template>

<script>
import Activity from './Activity.vue'
import GroupsList from './GroupsList.vue'
import Profile from './Profile.vue'
import Toggle from './Toggle.vue'
import ListItem from '@components/ListItem.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'Navigation',
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
        isActive: false,
        timeTravelComponentName: null
      }
    }
  },
  computed: {
    ...mapGetters([
      'unreadMessageCount',
      'colors'
    ]),
    activityCount () {
      // TODO: implement this? (or not?)
      return 0 + this.unreadMessageCount
    },
    logo () {
      const name = this.colors.theme === 'dark' ? '-white' : ''
      return `/assets/images/logo-transparent${name}.png`
    }
  },
  methods: {
    toggleMenu () {
      this.ephemeral.isActive = !this.ephemeral.isActive
    },
    enableTimeTravel (evt) {
      if (evt.shiftKey) {
        console.debug('enable time travel!')
        this.ephemeral.timeTravelComponentName = 'TimeTravel'
      }
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
  background: $general_2;
}

.c-navigation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0.45rem 0 $spacer;
  height: 4.6rem;
  margin-bottom: -0.1rem;
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

.c-menu-list-bottom {
  display: flex;
  flex-direction: column;
  margin-left: $spacer;
  font-size: $size-5;

  a {
    line-height: 1.65rem;
    color: $text_1;

    &:hover {
      font-weight: bold;
      color: $text_0;
    }
  }
}

.c-logo {
  min-width: 8rem;
  width: 8rem;
}

.c-group-list {
  padding-top: 1rem;
  padding-bottom: 0.8rem;
  background-color: $primary_2;
}

.c-toggle {
  left: 100%;
  height: 64px;

  @include tablet {
    display: none;
  }
}
</style>
