<template lang="pug">
section.card.c-card
  svg-conversation.c-svg
  div
    i18n.title(tag='h3') Invite member to your group
    i18n(tag='p') Start sharing your resources with the ones who matter to you!
    .buttons.is-start
      i18n(
        tag='button'
        @click='openModal'
      ) Add members
      router-link.button(
        to='/invite'
        data-test='inviteButton'
      ) {{ L('Invite members') }}
</template>

<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'
import SvgConversation from '@svgs/conversation.svg'

export default {
  name: 'StartInviting',
  components: {
    SvgConversation
  },
  methods: {
    openModal () {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'InviteByLink')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-card {
  display: flex;
}

.c-svg {
  width: 4rem;
  height: 4rem;
  margin-right: $spacer;
  flex-shrink: 0;

  @include widescreen {
    width: 6.25rem;
    height: 6.25rem;
    margin-right: 2.5rem;
  }
}

.c-sprite {
  display: none;
}
</style>
