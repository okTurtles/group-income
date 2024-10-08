<template lang='pug'>
.c-greetings
  i18n.is-title-4(tag='h3') Welcome!
  p {{text}}
  .buttons
    i18n.button.is-outlined.is-small.is-primary(
      v-if='!isGroupDirectMessage() && joined && members < 2'
      tag='button'
      @click='openModal("ChatMembersAllModal")'
      data-test='addMembers'
    ) Add members

    i18n.button.is-outlined.is-small(
      tag='button'
      v-if='!isGroupDirectMessage() && joined && !description && creatorID === ourIdentityContractId'
      @click.prevent='openModal("EditChannelDescriptionModal")'
      data-test='addDescription'
    ) Add a description

</template>

<script>
import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { mapGetters } from 'vuex'
import { CHATROOM_TYPES } from '@model/contracts/shared/constants.js'
import MessageNotification from './MessageNotification.vue'
import Avatar from '@components/Avatar.vue'
import { OPEN_MODAL } from '@utils/events.js'

export default ({
  name: 'ConversationGreetings',
  components: {
    MessageNotification,
    Avatar
  },
  props: {
    members: {
      type: Number
    },
    joined: {
      type: Boolean
    },
    creatorID: {
      type: String
    },
    dmToMyself: {
      type: Boolean
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
    ...mapGetters(['ourIdentityContractId', 'isGroupDirectMessage']),
    text () {
      if (this.dmToMyself) {
        return L('You can post private notes to yourself here.')
      }

      return {
        GIBot: L('I’m here to keep you update while you are away.'),
        // TODO: need to change text
        // Here's a new DM (chatroom contract) between [users] and here's the contract's address
        [CHATROOM_TYPES.DIRECT_MESSAGE]: L('You and {name} can chat in private here.', { name: this.name }),
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

  h3,
  p {
    text-align: left;
  }

  @include tablet {
    padding: 0 1.25rem 1.25rem 1.25rem;
  }
}

.buttons {
  margin-top: 1rem;
  justify-content: flex-start;

  .button {
    @include phone {
      width: calc(100% - 1rem);
      margin-top: 0.2rem;
      margin-bottom: 0.2rem;
    }
  }
}
</style>
