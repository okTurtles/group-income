<template lang='pug'>
page(
  pageTestName='GlobalDirectMessages'
  pageTestHeaderName='pageHeaderName'
)
  template(#title='') {{ L('Direct Messages') }}

  template(#sidebar='{ toggle }')
    chat-nav
      chat-members.c-dm-list(
        @new='toggle'
        @redirect='toggle'
        :hideNewButton='true'
      )

  .card.c-direct-messages-container
    .c-up-to-date-container
      i.icon-comment-dots.c-check-icon
      i18n.has-text-1 You're up to date!
</template>

<script>
import Page from '@components/Page.vue'
import ChatNav from '@containers/chatroom/ChatNav.vue'
import ChatMembers from '@containers/chatroom/ChatMembers.vue'

export default {
  name: 'DirectMessages',
  components: {
    Page,
    ChatNav,
    ChatMembers
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-direct-messages-container {
  margin-top: 1.25rem;
}

.c-up-to-date-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  row-gap: 0.25rem;

  .c-check-icon {
    font-size: 2.75rem;
    color: $text_1;
    line-height: 1.25;

    @include tablet {
      font-size: 3.25rem;
    }
  }
}

.c-dm-list {
  @include desktop {
    margin-top: 4rem;
  }
}
</style>
