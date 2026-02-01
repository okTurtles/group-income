<template lang='pug'>
modal-template(ref='modal' :a11yTitle='L("Add new members")')
  template(#title='')
    i18n Add new members

  .c-container
    template(v-if='link')
      i18n.is-title-4(tag='h3') Share this link to grant access to your group.
      i18n.has-text-1(tag='p' :args='{ count: anyoneLinkMax }') After the onboarding period has ended, everyone will be asked to vote on whether or not a new member should be added. But for now, enjoy {count} free passes!
      link-to-copy.c-link(:link='link')
      i18n.has-text-1(v-if='expireDate' tag='p' :args='{ expireDate }') This invite link expires on {expireDate}.
      i18n.has-text-1(v-else tag='p') This invite link doesn't expire
      i18n.is-outlined.c-cta(tag='button' @click.prevent='close') Awesome
    .c-broken(v-else)
      svg-broken-link.c-svg
      i18n.is-title-4(tag='h3') Broken invite link!
      i18n(
        tag='p'
        @click='handleBrokenInviteClick'
        :args='{ \
          a_: `<button class="link js-click">`, \
          _a: "</button>" \
        }'
      ) See {a_}logs for details{_a}.
      i18n.is-outlined.c-cta(tag='button' @click.prevent='close') OK
</template>
<script>
import { mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import LinkToCopy from '@components/LinkToCopy.vue'
import { humanDate } from '@model/contracts/shared/time.js'
import SvgBrokenLink from '@svgs/broken-link.svg'
import { buildInvitationUrl } from '@view-utils/buildInvitationUrl.js'
import { MAX_GROUP_MEMBER_COUNT } from '@model/contracts/shared/constants.js'

export default ({
  name: 'InvitationLinkModal',
  components: {
    ModalTemplate,
    LinkToCopy,
    SvgBrokenLink
  },
  computed: {
    ...mapGetters([
      'currentWelcomeInvite',
      'currentGroupState'
    ]),
    welcomeInviteSecret () {
      const key = this.currentGroupState._vm.invites?.[this.currentWelcomeInvite.inviteId]?.inviteSecret
      if (!key) {
        console.error(`undefined key for welcomeInviteId: ${this.currentWelcomeInvite.inviteId}`)
        return undefined
      }
      return key
    },
    link () {
      const key = this.welcomeInviteSecret
      if (key) {
        return buildInvitationUrl(this.$store.state.currentGroupId, this.currentGroupState.settings?.groupName, key)
      }
    },
    expireDate () {
      return humanDate(this.currentWelcomeInvite.expires, { month: 'long', day: 'numeric' })
    },
    anyoneLinkMax () {
      return MAX_GROUP_MEMBER_COUNT
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    handleBrokenInviteClick (e) {
      if (e.target.classList.contains('js-click')) {
        const errorMsg = 'Undefined key for invite'
        this.$router.push({
          path: '/user-settings/application-logs',
          query: { errorMsg }
        })
      }
    }
  }
}: Object)
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  text-align: center;
  max-width: 100%;
}

.c-link {
  margin-top: 2rem;
  margin-bottom: 0.5rem;
}

.c-cta {
  margin-top: 2rem;
}
</style>
