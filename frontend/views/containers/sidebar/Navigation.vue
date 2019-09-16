<template lang='pug'>
nav.c-navigation(
  role='navigation'
  :class='{ "is-active": ephemeral.isActive }'
)
  toggle(@toggle='toggleMenu')

  groups-list(v-if='groupsByName.length > 1')

  .c-navigation-wrapper
    .c-navigation-header
      h1.sr-only Main Menu

      router-link(to='/home')
        img.c-logo(:src='logo' alt='GroupIncome\'s logo')

      // NOTE/REVIEW: If we follow Messages GIBot approach, the bell icon wont be needed
      activity(:activityCount='activityCount')

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
          list-item(
            tag='router-link'
            to='/mailbox'
            icon='envelope'
            data-test='mailboxLink'
            :badgeCount='unreadMessageCount || activityCount'
          )
            i18n Inbox (deprecated)

        .c-navigation-separator(v-if='groupsByName.length < 2')
          router-link.button.is-small.is-outlined(
            to='/new-group/name'
            alt='L("Add a group")'
          )
            i.icon-plus
            i18n Add a group

        // Keep it here atm until we remove completly the mailbox
        list-item(
          tag='router-link'
          to='/messages'
          style='opacity: 0; cursor: default;'
          icon='envelope'
          :badgeCount='2'
        )
          i18n Messages

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
      'groupsByName',
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
      if (evt.shiftKey && process.env.NODE_ENV !== 'production') {
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
  padding: 0 $spacer;
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

.c-navigation-separator {
  text-align: center;
  margin: 1.5rem 1.5rem 0 1.5rem;
  border-top: 1px solid $general_0;
  padding-top: 1.5rem;
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
      color: $text_0;
    }
  }
}

.c-logo {
  min-width: 8rem;
  width: 8rem;
}

.c-toggle {
  left: 100%;
  height: 64px;

  @include tablet {
    display: none;
  }
}
</style>
