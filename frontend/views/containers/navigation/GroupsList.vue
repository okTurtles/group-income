<template lang='pug'>
ul.c-group-list(v-if='groupsByName.length' data-test='groupsList')
  li.c-group-list-item.group-badge(:class='{ "is-active": isInGlobalDashboard }')
    tooltip(
      direction='right'
      :text='L("Global dashboard")'
    )
      button.c-group-picture.is-unstyled.c-global-dashboard-logo(@click='onGlobalDashboardClick')
        avatar.c-avatar(
          src='/assets/images/group-income-icon-transparent-circle.png'
          alt='Global dashboard logo'
        )
      badge(
        v-if='hasNewNews'
        type='compact'
        data-test='globalDashboardBadge'
      )

  li.c-group-list-item.group-badge(
    v-for='(group, index) in groupsByName'
    :key='`group-${index}`'
    :class='{ "is-active": !isInGlobalDashboard && currentGroupId === group.contractID}'
  )
    tooltip(
      direction='right'
      :text='group.groupName'
    )
      button.c-group-picture.is-unstyled(@click='handleGroupSelect(group.contractID)')
        avatar.c-avatar(:src='groupPictureForContract(group.contractID)')
      badge(
        v-if='badgeVisiblePerGroup[group.contractID]'
        type='compact'
        :data-test='`groupBadge-${group.groupName}`'
      )

  li.c-group-list-item
    tooltip(
      direction='right'
      :text='L("Create a new group")'
    )
      button(
        class='is-icon has-background'
        @click='openModal("GroupCreationModal")'
        data-test='createGroup'
        :aria-label='L("Add a group")'
      )
        i.icon-plus
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters, mapState } from 'vuex'
import Avatar from '@components/Avatar.vue'
import Badge from '@components/Badge.vue'
import Tooltip from '@components/Tooltip.vue'
import { OPEN_MODAL } from '@utils/events.js'
import { fetchNews } from '@view-utils/misc.js'

export default ({
  name: 'GroupsList',
  components: {
    Avatar,
    Badge,
    Tooltip
  },
  data () {
    return {
      ephemeral: {
        latestNewsDate: null
      }
    }
  },
  created () {
    this.checkForNewNews()
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupsByName',
      'groupUnreadMessages',
      'unreadGroupNotificationCountFor',
      'ourPreferences'
    ]),
    badgeVisiblePerGroup () {
      return Object.fromEntries(
        this.groupsByName.map(group => ([
          group.contractID,
          this.groupUnreadMessages(group.contractID) + this.unreadGroupNotificationCountFor(group.contractID) > 0
        ]))
      )
    },
    isInGlobalDashboard () {
      return this.$route.path.startsWith('/global-dashboard')
    },
    hasNewNews () {
      // Don't show badge if we're currently on the news page
      if (this.$route.path === '/global-dashboard/news-and-updates' ||
        !this.ourPreferences?.lastSeenNewsDate ||
        !this.ephemeral.latestNewsDate
      ) {
        return false
      }

      return new Date(this.ephemeral.latestNewsDate) > new Date(this.ourPreferences.lastSeenNewsDate)
    }
  },
  methods: {
    openModal (mode) {
      sbp('okTurtles.events/emit', OPEN_MODAL, mode)
    },
    handleGroupSelect (id) {
      id && this.changeGroup(id)

      if (this.isInGlobalDashboard) {
        this.$router.push('/dashboard')
      }
    },
    onGlobalDashboardClick () {
      this.$emit('global-dashboard-click')
    },
    changeGroup (hash) {
      const path = this.$route.path
      const emptyGroupPicture = this.groupPictureForContract(hash) === ''
      if (hash !== this.currentGroupId) {
        sbp('gi.app/group/switch', hash)
      }
      if (emptyGroupPicture && path !== '/pending-approval') {
        this.$router.push(({ path: '/pending-approval' }))
      } else if (!emptyGroupPicture && path === '/pending-approval') {
        this.$router.push(({ path: '/dashboard' }))
      }
    },
    groupPictureForContract (contractID) {
      return this.$store.state[contractID]?.settings?.groupPicture || ''
    },
    async checkForNewNews () {
      try {
        const data = await fetchNews()
        if (data.length > 0) {
          this.ephemeral.latestNewsDate = data[0].createdAt
        }
      } catch (error) {
        console.error('Failed to check for new news:', error)
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-badge {
  top: 0;
  right: 1px; // Prevent badges from touching the vertical edge.
  z-index: 2; // Make badges appear above group avatars.
}

.c-group-list {
  width: 3.5rem;
  padding-top: 0.7rem;
  background-color: $general_1;
}

.c-group-list-item {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 3.2rem;
  margin-bottom: 0.25rem;
}

.group-badge {
  &::before {
    content: "";
    position: absolute;
    width: 3rem;
    height: 3rem;
    border: 1px solid transparent;
    border-radius: 50%;
    transform: scale(0.7);
    transition: all 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.38);
  }

  &.is-active {
    &::before {
      transform: scale(1);
      border-color: $text_0;
      animation: spin 0.5s ease-out;
    }
  }

  &:not(.is-active) {
    cursor: pointer;

    &:focus::before,
    &:hover::before {
      border-color: $white;
      border-width: 3px;
      transform: scale(1.1);
    }
  }
}

@keyframes spin {
  0% {
    transform: rotate(45deg);
    filter: hue-rotate(0deg);
    border-color: $primary_0 transparent transparent;
  }

  50% {
    transform: rotate(315deg);
    filter: hue-rotate(360deg);
    border-color: $primary_0 transparent transparent;
  }

  100% {
    transform: rotate(585deg);
    border-color: $white;
  }
}

.c-avatar {
  position: relative;
  z-index: 1;
}

.c-group-picture {
  display: flex;

  &.c-global-dashboard-logo {
    background-color: $background_0;
    border-radius: 50%;
    width: 2.5rem;
    height: 2.5rem;

    ::v-deep img.c-avatar {
      width: 1.75rem;
      height: 1.75rem;
    }
  }
}
</style>
