<template lang='pug'>
notifications-card
  button.is-icon-small.c-btn
    i.icon-bell(:class='notifCount ? "" : "is-active"')
    badge(v-if='notifCount' data-test='alertNotification') {{ notifCount }}
</template>

<script>
import NotificationsCard from './NotificationsCard.vue'
import Badge from '@components/Badge.vue'

export default {
  name: 'NotificationsBell',
  components: {
    Badge,
    NotificationsCard
  },
  computed: {
    notifCount: () => {
      return 2 // TODO
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-badge {
  position: absolute;
  top: -1px;
  right: -1px;
  line-height: 1rem;
  width: 1rem;
  height: 1rem;
  color: $background;
  background-color: $danger_0;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 600;
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
