<template lang='pug'>
modal-template(ref='modal')
  template(#title='')
    i18n Add new members

  .c-container
    i18n.title.is-4(tag='h3') Share this link to grant access to your group.
    i18n.has-text-1(tag='p') After the onboarding period has ended, everyone will be asked to vote on whether or not a new member should be added. But for now, enjoy 60 free passes!
    .c-link
      a.link.has-icon(:href='link' target='_blank' data-test='invitationLink')
        i.icon-link
        | {{link}}
    i18n.has-text-1(tag='p') This invite link expires on the [4th of February].
    i18n.is-outlined.c-cta(
      tag='button'
      @click.prevent='close'
    ) Awesome
</template>
<script>
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import { buildInvitationUrl } from '@model/contracts/voting/proposals.js'
export default {
  name: 'InviteByLink',
  components: {
    ModalTemplate
  },
  computed: {
    link () {
      console.log('ora')
      const invites = this.$store.getters.currentGroupState.invites
      const inviteWelcome = Object.keys(invites).find(invite => invites[invite].creator === 'GROUP_WELCOME')
      return buildInvitationUrl(this.$store.state.currentGroupId, invites[inviteWelcome].inviteSecret)
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    }
  }
}
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
.c-container {
  text-align: center;
}

.c-link {
  max-width: 20rem;
  word-break: break-all;
  margin: $spacer-lg auto $spacer-sm;

  .link {
    display: inline;
  }
}

.c-cta {
  margin-top: $spacer*3;
}
</style>
