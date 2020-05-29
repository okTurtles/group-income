<template lang='pug'>
modal-base-template.has-background(ref='modal' :fullscreen='true' :a11yTitle='L("Group members")')
  .c-container
    .c-header
      i18n.is-title-2.c-title(tag='h2') Notifications
      //- TODO - try to use as Vue link
      button.is-small.is-outlined
        i.icon-cog.is-prefix
        i18n Settings

    .card.c-card
      notifications-list(variant='default')
</template>

<script>
import sbp from '~/shared/sbp.js'
// import L, { LTags } from '@view-utils/translations.js'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import NotificationsList from './NotificationsList.vue'

export default {
  name: 'NotificationsModal',
  components: {
    ModalBaseTemplate,
    NotificationsList
  },
  data () {
    return {
      searchText: ''
    }
  },
  computed: {
    ...mapGetters([

    ])

  },
  methods: {
    openModal (modal, props) {
      // Hum...
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, props)
    },
    closeModal () {
      this.$refs.modal.close()
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  height: 100%;
  width: 100%;
  background-color: $general_2;
}

.c-header,
.c-container {
  @include tablet {
    width: 50rem;
    max-width: 100%;
  }
}

.c-header {
  display: flex;
  height: 4.75rem;
  justify-content: center;
  align-items: center;
  padding-top: 0;
  background-color: $background_0;
  margin: 0 -1rem;

  @include tablet {
    padding-top: 2rem;
    justify-content: space-between;
    align-items: baseline;
    background-color: transparent;
    margin: 0;
  }
}

.c-card {
  margin-top: 1.5rem;
}
</style>
