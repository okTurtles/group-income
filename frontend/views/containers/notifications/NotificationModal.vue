<template lang='pug'>
modal-base-template.has-background(ref='modal' :fullscreen='true' :a11yTitle='L("Group members")')
  .c-container
    .c-header
      i18n.is-title-2.c-title(tag='h2') Notifications
      button.is-small.is-outlined.c-btnSettings(@click='clickSettings')
        i.icon-cog.is-prefix
        i18n Settings

    .card.c-card
      notification-list(variant='default')
</template>

<script>
import sbp from '@sbp/spb'
import { OPEN_MODAL } from '@utils/events.js'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import NotificationList from './NotificationList.vue'

export default {
  name: 'NotificationModal',
  components: {
    ModalBaseTemplate,
    NotificationList
  },
  data () {
    return {
      searchText: ''
    }
  },
  methods: {
    clickSettings () {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'UserSettingsModal', {
        section: 'notifications'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-btnSettings {
  @include phone {
    position: absolute;
    left: 1rem;
    margin-top: 8rem;
  }
}

.c-card {
  margin-top: 1.5rem;

  @include phone {
    margin-top: 3.5rem;
  }
}

.c-container {
  background-color: $general_2;
  height: 100%;
  width: 100%;

  @include tablet {
    max-width: 100%;
    width: 50rem;
  }
}

.c-header {
  display: flex;
  align-items: center;
  background-color: $background_0;
  justify-content: flex-start;
  margin: 0 -1rem;
  min-height: 4.75rem;
  padding: 0 1rem;

  @include tablet {
    align-items: baseline;
    background-color: transparent;
    justify-content: space-between;
    margin: 0;
    max-width: 100%;
    padding: 2rem 0 0;
    width: 50rem;
  }
}
</style>
