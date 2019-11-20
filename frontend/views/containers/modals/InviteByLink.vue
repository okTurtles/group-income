<template lang='pug'>
modal-template(ref='modal')
  template(#title='')
    i18n Add new members

  .c-container
    i18n.is-title-4(tag='h3') Share this link to grant access to your group.
    i18n.has-text-1(tag='p') After the onboarding period has ended, everyone will be asked to vote on whether or not a new member should be added. But for now, enjoy 60 free passes!
    invite-link-to-copy.c-link(:inviteLink='link')
    i18n.has-text-1(tag='p') This invite link expires on the 4th of February.
    i18n.is-outlined.c-cta(
      tag='button'
      @click.prevent='close'
    ) Awesome
</template>
<script>
import { mapGetters } from 'vuex'
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import InviteLinkToCopy from '@components/InviteLinkToCopy.vue'

export default {
  name: 'InviteByLink',
  components: {
    ModalTemplate,
    InviteLinkToCopy
  },
  computed: {
    ...mapGetters([
      'currentGroupState'
    ]),
    welcomeInviteSecret () {
      const invites = this.currentGroupState.invites
      return Object.keys(invites).find(invite => invites[invite].creator === INVITE_INITIAL_CREATOR)
    },
    link () {
      return buildInvitationUrl(this.$store.state.currentGroupId, this.welcomeInviteSecret)
    },
    expireDate () {
      // TODO retrive real expire date
      // const expireDate = this.welcomeInviteSecret.expireDate // format this
      return '4th of February'
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
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: $spacer-lg;
  margin-bottom: $spacer-sm;

  ::v-deep .c-copy-button {
    margin-left: $size-3/2;
  }
}

.c-cta {
  margin-top: $spacer*3;
}
</style>
