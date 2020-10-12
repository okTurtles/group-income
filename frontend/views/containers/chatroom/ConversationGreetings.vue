<template lang='pug'>
.c-greetings
  i18n.is-title-4(tag='h3') Welcome!
  p {{text}}
  .buttons
    i18n.button.is-outlined.is-small(
      tag='button'
      @click='addMembers'
      data-test='addMembers'
    ) Add members

    i18n.button.is-outlined.is-small(
      tag='button'
      @click='addDescription'
      data-test='addDescription'
    ) Add a description

</template>

<script>
import { chatTypes } from './fakeStore.js'
import MessageNotification from './MessageNotification.vue'
import Avatar from '@components/Avatar.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'ConversationGreetings',
  components: {
    MessageNotification,
    Avatar
  },
  props: {
    type: {
      type: String
    },
    name: {
      type: String
    }
  },
  computed: {
    text () {
      console.log(this.type, chatTypes.GROUP)
      return {
        GIBot: L('I’m here to keep you update while you are away.'),
        [chatTypes.INDIVIDUAL]: L('You and {name} can chat in private here.', { name: this.name }),
        [chatTypes.GROUP]: L('This is the beginning of {name}.', { name: this.name })
      }[this.type]
    }
  },
  methods: {
    addMembers () {
      console.log('TODO')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-greetings {
  margin-bottom: 2rem;
}

.buttons {
  margin-top: 1rem;
  justify-content: flex-start;
}
</style>
