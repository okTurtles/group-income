<template lang='pug'>
div
  router-link.button.is-icon-small.c-btn.hide-tablet(:to='{ query: { modal: "NotificationsModal" }}')
    i.icon-bell(:class='{ "is-active": notificationCount }')
    badge(v-if='notificationCount' data-test='alertNotification') {{ notificationCount }}
  notification-card
    button.is-icon-small.c-btn.hide-phone
      i.icon-bell(:class='{ "is-active": notificationCount }')
      badge(v-if='notificationCount' data-test='alertNotification') {{ notificationCount }}
</template>

<script>
import { mapGetters } from 'vuex'
import NotificationCard from './NotificationCard.vue'
import Badge from '@components/Badge.vue'

export default {
  name: 'NotificationBell',
  components: {
    Badge,
    NotificationCard
  },
  computed: {
    ...mapGetters([
      'notificationCount'
    ])
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-badge {
  top: -0.25rem;
  right: -0.25rem;
}

.icon-bell {
  font-size: 0.9rem;
  transform-origin: center 2px;
  margin-top: 2px;

  &.is-active {
    font-weight: 900;
  }
}

.c-btn:hover,
.c-btn:focus {
  .icon-bell {
    animation: bell 750ms forwards;
  }
}

@keyframes bell {
  10% { transform: rotate(15deg); }
  20% { transform: rotate(-15deg); }
  35% { transform: rotate(15deg); }
  60% { transform: rotate(-10deg); }
  80% { transform: rotate(5deg); }
}
</style>
