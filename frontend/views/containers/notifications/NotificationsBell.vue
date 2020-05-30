<template lang='pug'>
notifications-card
  button.is-icon-small.c-btn
    i.icon-bell(:class='notifCount ? "" : "is-active"')
    badge(v-if='notifCount' data-test='alertNotification') {{ notifCount }}
</template>

<script>
import { mapGetters } from 'vuex'
import NotificationsCard from './NotificationsCard.vue'
import Badge from '@components/Badge.vue'

export default {
  name: 'NotificationsBell',
  components: {
    Badge,
    NotificationsCard
  },
  computed: {
    ...mapGetters([
      'groupMembersCount'
    ]),
    notifCount () {
      // TODO this
      if (this.groupMembersCount === 1) {
        return 0
      }
      if (this.groupMembersCount === 2) {
        return 1
      }

      return 7
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
