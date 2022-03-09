<template lang='pug'>
.c-greetings
  i18n.is-title-4(tag='h3') Welcome!
  p {{text}}
  .buttons
    i18n.button.is-outlined.is-small.is-primary(
      v-if='members < 2'
      tag='button'
      @click='openModal("ChatMembersAllModal")'
      data-test='addMembers'
    ) Add members

    i18n.button.is-outlined.is-small(
      tag='button'
      v-if='!description && creator === ourUsername'
      @click.prevent='openModal("EditChannelDescriptionModal")'
      data-test='addDescription'
    ) Add a description

</template>

<script>
import { mapGetters } from 'vuex'
import { CHATROOM_TYPES } from '@model/contracts/constants.js'
import MessageNotification from './MessageNotification.vue'
import Avatar from '@components/Avatar.vue'
import L from '@view-utils/translations.js'
import { OPEN_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'

export default ({
  name: 'ConversationGreetings',
  components: {
    MessageNotification,
    Avatar
  },
  props: {
    members: {
      type: Number,
    },
    creator: {
      type: String
    },
    type: {
      type: String
    },
    name: {
      type: String
    },
    description: {
      type: String
    }
  },
  computed: {
    ...mapGetters(['ourUsername']),
    text () {
      return {
        GIBot: L('I’m here to keep you update while you are away.'),
        [CHATROOM_TYPES.INDIVIDUAL]: L('You and {name} can chat in private here.', { name: this.name }),
        [CHATROOM_TYPES.GROUP]: L('This is the beginning of {name}.', { name: this.name })
      }[this.type]
    }
  },
  methods: {
    openModal (modal, props) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, props)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-greetings {
  padding: 0.5rem 1rem;

  @include tablet {
    padding: 0 2.5rem 2rem 2.5rem;
  }
}

.buttons {
  margin-top: 1rem;
  justify-content: flex-start;

  .button {
    @include phone {
      width: calc(100% - 1rem);
    }
  }
}
</style>
