<template lang='pug'>
div
  img.c-logo(src='/assets/images/logo-transparent.png')

  loading(theme='fullView' v-if='isStatus("LOADING")')
  .c-page(v-else)
    div(v-if='isStatus("SIGNING") || isStatus("LOGGING")')
      .c-header
        .c-avatars
          avatar.c-avatars-group(
            v-if='ephemeral.invitation.groupPicture'
            :src='ephemeral.invitation.groupPicture'
            size='lg'
          )
          avatar.c-avatars-creator(
            v-if='ephemeral.invitation.creatorPicture'
            :src='ephemeral.invitation.creatorPicture'
          )
        h1.is-title-1.c-title(data-test='groupName') {{ ephemeral.invitation.groupName }}
        p.has-text-1(data-test='invitationMessage') {{ ephemeral.invitation.message }}
      .card
        signup-form(v-if='isStatus("SIGNING")' @submitSucceeded='accept')
        login-form(v-else @submitSucceeded='accept')

      p.c-switchEnter(v-if='isStatus("SIGNING")')
        i18n Already have an account?
        | &nbsp;
        i18n.link(tag='button' @click='pageStatus = "LOGGING"') Log in
      p.c-switchEnter(v-else)
        i18n Not on Group Income yet?
        | &nbsp;
        i18n.link(tag='button' @click='pageStatus = "SIGNING"') Create an account

    group-welcome.c-welcome(v-else-if='isStatus("WELCOME")')

    .c-broken(v-else-if='isStatus("INVALID") || isStatus("EXPIRED")')
      svg-broken-link.c-svg
      i18n.is-title-1(
        v-if='isStatus("INVALID")'
        tag='h1'
        data-test='pageTitle'
        :args='LTags()'
      ) Oh no! {br_}Something went wrong.
      i18n.is-title-1(
        v-else
        tag='h1'
        data-test='pageTitle'
        :args='LTags()'
      ) Oh no! {br_}Your link has expired.
      p.has-text-1(data-test='helperText') {{ ephemeral.errorMsg }}
      i18n.c-goHome(tag='button' @click='goHome') Take me home
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import { INVITE_INITIAL_CREATOR, INVITE_STATUS } from '@model/contracts/group.js'
import SignupForm from '@containers/access/SignupForm.vue'
import LoginForm from '@containers/access/LoginForm.vue'
import Loading from '@components/Loading.vue'
import Avatar from '@components/Avatar.vue'
import GroupWelcome from '@components/GroupWelcome.vue'
import SvgBrokenLink from '@svgs/broken-link.svg'
import L from '@view-utils/translations.js'

export default {
  name: 'Join',
  components: {
    Loading,
    LoginForm,
    SignupForm,
    Avatar,
    GroupWelcome,
    SvgBrokenLink
  },
  data () {
    return {
      ephemeral: {
        pageStatus: 'LOADING',
        invitation: {}
      }
    }
  },
  computed: {
    ...mapGetters(['ourUsername']),
    pageStatus: {
      get () { return this.ephemeral.pageStatus },
      set (status) {
        const posibleStatus = ['LOADING', 'WELCOME', 'SIGNING', 'LOGGING', 'EXPIRED', 'INVALID']
        if (!posibleStatus.includes(status)) {
          throw new Error(`Bad status: ${status}. Use one of the following: ${posibleStatus.join(', ')}`)
        }
        this.ephemeral.pageStatus = status
      }
    }
  },
  async mounted () {
    try {
      if (this.ourUsername) {
        if (this.$store.state.contracts[this.$route.query.groupId]) {
          this.$router.push({ path: '/dashboard' })
          return
        } else {
          await this.accept()
          return
        }
      }
      const state = await sbp('state/latestContractState', this.$route.query.groupId)
      const invite = state.invites[this.$route.query.secret]
      if (!invite) {
        this.ephemeral.errorMsg = L('This invite is not valid.')
        this.pageStatus = 'INVALID'
      } else if (invite && invite.status !== INVITE_STATUS.VALID) {
        this.ephemeral.errorMsg = L('You should ask for a new one. Sorry about that!')
        this.pageStatus = 'EXPIRED'
      } else {
        let creator = null
        let creatorPicture = null
        let message = null

        if (invite.creator === INVITE_INITIAL_CREATOR) {
          message = L('You were invited to join')
        } else {
          const identityContractID = await sbp('namespace/lookup', invite.creator)
          const userState = await sbp('state/latestContractState', identityContractID)
          const userDisplayName = userState.attributes.displayName || userState.attributes.name
          message = L('{who} invited you to join their group!', { who: userDisplayName })
          creator = userDisplayName
          creatorPicture = userState.attributes.picture
        }

        this.ephemeral.invitation = {
          groupName: state.settings.groupName,
          groupPicture: state.settings.groupPicture,
          creator,
          creatorPicture,
          message
        }
        this.pageStatus = 'SIGNING'
      }
    } catch (e) {
      console.error(e)
      this.ephemeral.errorMsg = `${L('Something went wrong. Please, try again.')} ${e.message}`
      this.pageStatus = 'INVALID'
    }
  },
  methods: {
    isStatus (status) {
      return this.pageStatus === status
    },
    goHome () {
      this.$router.push({ path: '/' })
    },
    async accept () {
      this.ephemeral.errorMsg = null
      const { groupId, secret } = this.$route.query || {}

      try {
        await sbp('gi.actions/group/joinAndSwitch', {
          groupId,
          inviteSecret: secret
        })
        this.pageStatus = 'WELCOME'
      } catch (e) {
        console.error('Join.vue accept() error:', e)
        this.ephemeral.errorMsg = e.message
        this.pageStatus = 'INVALID'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-logo {
  min-width: 8rem;
  width: 8rem;
  margin: auto;

  @include tablet {
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
  }
}

.c-page {
  max-width: 33rem;
  margin: auto;
}

.c-welcome {
  margin-top: -1.5rem; // makeup for the default l-page padding-top to respect 100vh
}

.c-header {
  margin-top: $spacer;
  display: flex;
  flex-direction: column;
  align-items: center;

  .c-title {
    order: 2;
  }

  @include tablet {
    margin-top: 2.5rem;
  }
}

.c-avatars {
  position: relative;
  margin-bottom: 1.5rem;

  .c-avatars-group.is-lg {
    @include tablet {
      width: 8rem;
      height: 8rem;
    }
  }

  .c-avatars-creator {
    position: absolute;
    bottom: 0;
    right: 0;
    border: 2px solid $white;
  }
}

.card {
  padding: 1.5rem $spacer;
  margin-top: 1.5rem;

  @include tablet {
    padding: 2.5rem;
  }
}

.c-switchEnter {
  margin-top: 1.5rem;
  text-align: center;
}

.c-broken {
  margin-top: 20vh;
  text-align: center;

  .is-title-1 {
    margin-top: 3rem;
    margin-bottom: $spacer-sm;
  }

  .c-goHome {
    margin-top: $spacer-lg;
  }
}

@include tablet {
  .c-debug {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
  }
}
</style>
