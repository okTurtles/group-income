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
    .card.c-card(role='dialog' :aria-label='L("Notifications")')
      .c-header
        i18n.is-title-4(tag='h2') Notifications
        i18n.link(tag='button') Settings

      .c-empty(v-if='!notifCount')
        i18n.has-text-1 Nothing to see here... yet!
      div(v-else)
        .c-list
          notifications-list(variant='compact')
        .c-footer
          router-link.link(:to='{ query: { modal: "NotificationsModal" }}' @click.native='toggleTooltip')
            i18n See all

      // TODO @mmbotelho find a better place for btn.
      modal-close.c-close(:aria-label='L("Close profile")' @close='toggleTooltip')
</template>

<script>
import { mapGetters } from 'vuex'
import ModalClose from '@components/modal/ModalClose.vue'
import NotificationsList from './NotificationsList.vue'
import Tooltip from '@components/Tooltip.vue'

export default {
  name: 'NotificationsCard',
  components: {
    ModalClose,
    NotificationsList,
    Tooltip
  },
  methods: {
    toggleTooltip () {
      this.$refs.tooltip.toggle()
    }
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
    box-shadow: 0 0.5rem 1.25rem rgba(54, 54, 54, 0.3);
    width: 25rem;
    padding: 0;
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

.c-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1rem 0.5rem;
}

.c-empty {
  padding: 2rem 1rem;
  text-align: center;
}

.c-list {
  height: 18rem;
  overflow: scroll;
  overscroll-behavior-y: contain;
}

.c-footer {
  border-top: 1px solid $general_1;
  padding: 0.5rem 1rem 1rem;
  text-align: center;
}
</style>
