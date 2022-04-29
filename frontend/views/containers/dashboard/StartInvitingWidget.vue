<template lang="pug">
  callout-card(
    :isCard='true'
    :title='L("Invite members to your group")'
    :svg='SvgConversation'
  )
    i18n(tag='p') Start sharing your resources with the ones who matter to you!
    i18n(tag='button' @click='openModal') Add members
</template>

<script>
import sbp from '@sbp/sbp'
import { OPEN_MODAL } from '@utils/events.js'
import CalloutCard from '@components/CalloutCard.vue'
import SvgConversation from '@svgs/conversation.svg'

export default ({
  name: 'StartInvitingWidget',
  components: {
    CalloutCard,
    SvgConversation
  },
  data () {
    return {
      SvgConversation
    }
  },
  methods: {
    openModal () {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'InvitationLinkModal')
    }
  }
}: Object)
</script>
