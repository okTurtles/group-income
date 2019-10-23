<template lang='pug'>
div
  img.c-logo(src='/assets/images/logo-transparent.png')

  loading(theme='fullView' v-if='isStatus("LOADING")')
  .c-page(v-else)
    .c-joining(v-if='isStatus("SIGNING") || isStatus("LOGGING")')
      .c-header
        .c-avatars
          avatar.c-avatars-group(
            v-if='ephemeral.fakeInvitation.groupPicture'
            :src='ephemeral.fakeInvitation.groupPicture'
          )
          avatar.c-avatars-creator(
            v-if='ephemeral.fakeInvitation.creatorPicture'
            :src='ephemeral.fakeInvitation.creatorPicture'
          )
        h1.title.is-1 [The Dreamers]
        i18n.has-text-1(
          tag='p'
          :args='{ who: ephemeral.fakeInvitation.creator }'
        ) {who} invited you to join their group!
      .card
        form-signup(v-if='isStatus("SIGNING")' @submitSucceeded='accept')
        form-login(v-else @submitSucceeded='accept')

      p.c-switchEnter(v-if='isStatus("SIGNING")')
        i18n Already have an account?
        | &nbsp;
        i18n.link(tag='button' @click='setStatus("LOGGING")' data-test='goToLogin') Log in
      p.c-switchEnter(v-else)
        i18n Not on Group Income yet?
        | &nbsp;
        i18n.link(tag='button' @click='setStatus("SIGNING")' data-test='goToSingup') Create an account

    group-welcome.c-welcome(v-else-if='isStatus("WELCOME")')

    .c-broken(v-else-if='isStatus("INVALID")')
      svg-broken-link.c-svg
      i18n.title.is-1(
        tag='h1'
        :args='{ ...LTags() }'
      ) Oh no! {br_} Something went wrong!
      | {{ ephemeral.errorMsg }}
      i18n.c-goHome(tag='button' @click='goHome') Take me home

    .c-broken(v-else-if='isStatus("EXPIRED")')
      svg-broken-link.c-svg
      i18n.title.is-1(
        tag='h1'
        :args='{ ...LTags() }'
      ) Oh no! {br_} Your link has expired!
      i18n(tag='p') You should ask for a new one. Sorry about that!
      i18n.c-goHome(tag='button' @click='goHome') Take me home
    .c-broken(v-else-if='isStatus("SHARE_INVITE")')
      svg-broken-link.c-svg
      i18n.title.is-1(
        tag='h1'
        :args='{ ...LTags(), groupName: fakeInvitation.groupName }'
      ) You are already part of {groupName}
      i18n(tag='p') You should ask for a new one. Sorry about that!
      i18n.c-goHome(tag='button' @click='goHome') Take me home

  .buttons.c-debug
    button.is-small.is-outlined(@click='setStatus("LOADING")') LOADING
    button.is-small.is-outlined(@click='setStatus("SIGNING")') SIGNING
    button.is-small.is-outlined(@click='setStatus("WELCOME")') WELCOME
    button.is-small.is-outlined(@click='setStatus("EXPIRED")') EXPIRED
    button.is-small.is-outlined(@click='setStatus("INVALID")') INVALID
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import FormSignup from '@containers/forms/FormSignup.vue'
import FormLogin from '@containers/forms/FormLogin.vue'
import Loading from '@components/Loading.vue'
import Avatar from '@components/Avatar.vue'
import SvgBrokenLink from '@svgs/broken-link.svg'
import L from '@view-utils/translations.js'
import GroupWelcome from '@components/GroupWelcome.vue'

export default {
  name: 'Join',
  components: {
    Loading,
    FormLogin,
    FormSignup,
    Avatar,
    GroupWelcome,
    SvgBrokenLink
  },
  data () {
    return {
      ephemeral: {
        pageStatus: 'LOADING', // LOADING || WELCOME || SIGNING || LOGGING || EXPIRED || INVALID
        fakeInvitation: {}
      }
    }
  },
  computed: {
    ...mapGetters(['ourUsername'])
  },
  async mounted () {
    try {
      if (this.ourUsername) {
        if (this.$store.state.contracts[this.$route.query.groupId]) {
          this.$router.push({ path: '/dashboard' })
        } else {
          await this.accept()
          return
        }
      }
      // TODO - wait for #743 to be fixed...
      // const state = await sbp('state/latestContractState', this.$route.query.groupId)

      // ... Until then, mock valid GroupState
      this.ephemeral.fakeInvitation = {
        groupName: '[The Dreamers]',
        creator: '[Margarida]',
        creatorPicture: '/assets/images/default-avatar.png',
        groupPicture: '/assets/images/default-avatar.png'
      }
      setTimeout(() => this.setStatus('SIGNING'), 500)
    } catch (ex) {
      console.error(ex)
      // TODO: Better error msg: invalid secret, non-existent group, etc...
      this.ephemeral.errorMsg = L('This links is not valid')
      this.setStatus('INVALID')
    }
  },
  methods: {
    isStatus (status) {
      return this.ephemeral.pageStatus === status
    },
    setStatus (status) {
      this.ephemeral.pageStatus = status
    },
    goHome () {
      this.$router.push({ path: '/' })
    },
    async accept () {
      try {
        // post acceptance event to the group contract
        this.ephemeral.errorMsg = null
        const groupId = this.$route.query.groupId
        const acceptance = await sbp('gi.contracts/group/inviteAccept/create',
          { inviteSecret: this.$route.query.secret },
          groupId
        )
        // let the group know we've accepted their invite
        await sbp('backend/publishLogEntry', acceptance)
        // sync the group's contract state
        await sbp('state/enqueueContractSync', groupId)
        // after syncing, we can set the current group
        this.$store.commit('setCurrentGroupId', groupId)
        this.setStatus('WELCOME')
      } catch (ex) {
        console.log(ex)
        // TODO: post this to a global notification system instead of using this.ephemeral.errorMsg
        this.ephemeral.errorMsg = L('Failed to Accept Invitation')
        this.setStatus('INVALID')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-logo {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  min-width: 8rem;
  width: 8rem;
}

.c-welcome {
  margin-top: -1.5rem; // makeup for the default l-page padding-top and respect 100vh
}

.c-header {
  margin-top: $spacer-lg;
  display: flex;
  flex-direction: column;
  align-items: center;

  .title {
    order: 2;
  }
}

.c-avatars {
  position: relative;
  margin-bottom: 1.5rem;

  .c-avatars-group {
    width: 8rem; // TODO #672
    height: 8rem;
  }

  .c-avatars-creator {
    position: absolute;
    bottom: 0;
    right: 0;
    border: 2px solid $white;
    width: 2.5rem;
    height: 2.5rem;
  }
}

.card {
  width: 33rem;
  max-width: 100%;
  padding: $spacer-sm;
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

  .title {
    margin-top: 3rem;
    margin-bottom: $spacer-sm;
  }

  .c-goHome {
    margin-top: $spacer-lg;
  }
}

.c-debug {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
}
</style>
