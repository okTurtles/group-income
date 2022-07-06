<template lang='pug'>
tooltip(
  direction='right'
  :manual='true'
  ref='tooltip'
  :opacity='1'
  :aria-label='L("Show notifications")'
)
  slot

  template(slot='tooltip')
    .card.c-card(role='dialog' :aria-label='L("Notifications")' data-test='notificationCard')
      .c-header
        i18n.is-title-4(tag='h2') Notifications
        button.is-icon-small.c-settings-btn(@click='handleSettingsClick')
          i.icon-cog

      .c-body
        notification-list(variant='compact' @select='toggleTooltip')
      .c-footer(v-if='currentNotificationCount')
        i18n.link(tag='button'
          @click='markAllNotificationsAsRead'
          data-test='markAllAsRead_In_Tooltip'
        ) Mark all as read

        router-link.link(:to='{ query: { modal: "NotificationModal" }}' @click.native='toggleTooltip')
          i18n See all

      modal-close.c-close(:aria-label='L("Close profile")' @close='toggleTooltip')
</template>

<script>
import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import ModalClose from '@components/modal/ModalClose.vue'
import Tooltip from '@components/Tooltip.vue'
import NotificationList from './NotificationList.vue'

export default {
  name: 'NotificationCard',
  components: {
    ModalClose,
    NotificationList,
    Tooltip
  },
  methods: {
    toggleTooltip () {
      this.$refs.tooltip.toggle()
    },
    handleSettingsClick () {
      // BUG - Section notification does not open. Fixed at #946
      sbp('okTurtles.events/emit', OPEN_MODAL, 'UserSettingsModal', {
        section: 'notifications'
      })
      this.toggleTooltip()
    },
    markAllNotificationsAsRead () {
      sbp('gi.notifications/markAllAsRead', this.currentGroupId)
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'currentNotificationCount'
    ])
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-card {
  position: relative;
  padding: 0 0 4rem;
  color: $text_0;
  max-width: 100vw;
  border-radius: 3px;
  width: 100vw;
  box-shadow: none;

  &:last-child {
    margin-bottom: 0;
  }

  // is-active is from tooltip
  .is-active & {
    animation: zoom 100ms both cubic-bezier(0.165, 0.84, 0.44, 1);
    @include phone {
      animation-name: enterFromBottom;
    }
  }

  @include tablet {
    margin-top: -0.5rem; // better aligned with bell icon
    box-shadow: 0 0.5rem 1.25rem rgba(54, 54, 54, 0.3);
    width: 25rem;
    padding: 0;

    // triangle corner
    &::before {
      content: "";
      position: absolute;
      top: 1rem;
      left: -0.5rem;
      display: block;
      width: 0;
      z-index: 0;
      border-top: 0.5rem solid transparent;
      border-right: 0.5rem solid $background;
      border-bottom: 0.5rem solid transparent;
    }
  }
}

.c-close {
  left: calc(100vw - 4rem);
  top: 1.5rem;

  @include tablet {
    left: auto;
    right: 1rem;
    opacity: 0;
    pointer-events: none;

    &:focus {
      opacity: 1;
    }
  }
}

.c-header,
.c-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.c-header {
  padding: 1rem 1rem 0.5rem;
}

.c-footer {
  border-top: 1px solid $general_1;
  padding: 0.75rem 1rem;
}

.c-body {
  height: 18rem;
  overflow: auto;
  overscroll-behavior-y: contain;
}

.c-settings-btn {
  .icon-cog {
    transform-origin: 49% 48%;
  }

  &:hover .icon-cog,
  &:focus .icon-cog {
    animation: cog 400ms forwards;
  }
}

@keyframes cog {
  to { transform: rotate(180deg); }
}
</style>
