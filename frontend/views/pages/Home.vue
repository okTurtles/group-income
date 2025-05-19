<template lang='pug'>
main.c-splash(data-test='homeLogo' v-if='!currentGroupId')
  //- TODO: split this into two files, one showing the login/signup buttons
  //-       and the other showing the create/join group buttons!
  header(v-if='!isLoggedIn' key='title-login')
    img.logo(src='/assets/images/group-income-icon-transparent.png')
    i18n.is-title-1(tag='h1' data-test='welcomeHome') Welcome to Group Income

  header(v-else key='title-not-login')
    img.logo-2(src='/assets/images/logo-transparent.png')
    i18n.is-subtitle(tag='p') Welcome to Group Income
    i18n.is-title-1(tag='h1' data-test='welcomeHomeLoggedIn') Let’s get this party started

  .buttons(v-if='!isLoggedIn' key='body-loggin')
    i18n(
      tag='button'
      ref='loginBtn'
      @click='openModal("LoginModal")'
      data-test='loginBtn'
    ) Login

    i18n(
      tag='button'
      ref='signupBtn'
      @click='openModal("SignupModal")'
      @keyup.enter='openModal("SignupModal")'
      data-test='signupBtn'
      v-focus=''
    ) Signup

  .create-or-join(v-else key='body-create')
    .card
      svg-create-group
      i18n.is-title-3(tag='h3') Create
      i18n(tag='p') Create a new group and invite your friends.

      i18n(
        tag='button'
        @click='openModal("GroupCreationModal")'
        data-test='createGroup'
        :aria-label='L("Add a group")'
      ) Create Group

    .card
      svg-join-group
      i18n.is-title-3(tag='h3') Join
      i18n(tag='p') Enter an existing group using your username.
      i18n(
        tag='button'
        @click='openModal("GroupJoinModal")'
        data-test='joinGroup'
      ) Join a Group

  banner-simple.hide-hoverable-device.hide-tablet.c-pwa-promo(
    v-if='!isLoggedIn && ephemeral.showPwaPromo'
    severity='general'
  )
    template(#header='')
      i18n Install this web app on your device for better usability.

    button-submit.is-success.is-small.c-install-btn(
      type='button'
      @click='onInstallClick'
    ) {{ L('Install') }}

  footer.c-footer(v-if='!isLoggedIn && ephemeral.serverMessages.length > 0')
    banner-simple.c-demo-warning(v-for='text in ephemeral.serverMessages' severity='warning')
      render-message-with-markdown(:text='text')
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters, mapState } from 'vuex'
import { ACCEPTED_GROUP, OPEN_MODAL, PWA_INSTALLABLE } from '@utils/events.js'
import BannerSimple from '@components/banners/BannerSimple.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import RenderMessageWithMarkdown from '@containers/chatroom/chat-mentions/RenderMessageWithMarkdown.js'
import SvgCreateGroup from '@svgs/create-group.svg'
import SvgJoinGroup from '@svgs/join-group.svg'
import { ignoreWhenNavigationCancelled } from '~/frontend/views/utils/misc.js'

export default ({
  name: 'Home',
  components: {
    SvgJoinGroup,
    SvgCreateGroup,
    BannerSimple,
    ButtonSubmit,
    RenderMessageWithMarkdown
  },
  computed: {
    ...mapGetters([
      'currentIdentityState',
      'seenWelcomeScreen'
    ]),
    ...mapState([
      'currentGroupId'
    ]),
    isLoggedIn () {
      return !!this.$store.state.loggedIn
    }
  },
  data () {
    return {
      ephemeral: {
        serverMessages: [],
        seenWelcomeScreen: false,
        listener: ({ contractID }) => {
          if (contractID !== this.currentGroupId) return
          // For first time joins, force redirect to /pending-approval
          this.ephemeral.seenWelcomeScreen = false
        },
        showPwaPromo: false
      }
    }
  },
  beforeMount () {
    sbp('okTurtles.events/on', ACCEPTED_GROUP, this.ephemeral.listener)
    this.checkPwaInstallability()
    fetch(`${sbp('okTurtles.data/get', 'API_URL')}/serverMessages`).then(async (r) => {
      const data = await r.json()
      this.ephemeral.serverMessages = data.filter((msg) => msg.type === 'giHomeWarning').map((msg) => msg.message)
    }).catch(e => {
      console.error('[Home.vue] Error fetching or processing server announcements', e)
    })
  },
  mounted () {
    this.ephemeral.seenWelcomeScreen = this.seenWelcomeScreen
    if (this.isLoggedIn && this.currentGroupId) {
      this.navigateToGroupPage()
    } else if (this.$route.query.next) {
      this.openModal('LoginModal')
    }
  },
  destroyed () {
    sbp('okTurtles.events/off', ACCEPTED_GROUP, this.ephemeral.listener)
  },
  methods: {
    openModal (mode) {
      sbp('okTurtles.events/emit', OPEN_MODAL, mode)
    },
    navigateToGroupPage () {
      // NOTE:
      // When browser refresh is triggered, there is an issue that Vue router prematurely decides ('loginGuard' there) that
      // the user is not signed in when in actual reality user-login is still being processed and then
      // takes user to 'Home.vue' with the '$route.query.next' being set to the initial url.
      // In this particular condition, the app needs to immediately redirect user to '$route.query.next'
      // so that the user stays in the same page after the browser refresh.
      // (Related GH issue: https://github.com/okTurtles/group-income/issues/1830)
      const path = this.$route.query.next ?? (this.ephemeral.seenWelcomeScreen ? '/dashboard' : '/pending-approval')
      this.$router.push({ path }).catch(e => ignoreWhenNavigationCancelled(e, path))
    },
    checkPwaInstallability () {
      this.ephemeral.showPwaPromo = sbp('service-worker/check-pwa-installability')
      sbp('okTurtles.events/once', PWA_INSTALLABLE, () => {
        this.ephemeral.showPwaPromo = true
      })
    },
    async onInstallClick () {
      await sbp('service-worker/trigger-install-prompt')
    }
  },
  watch: {
    currentGroupId (to) {
      // Redirect to `/pending-approval` if our profile isn't active or the
      // welcome screen hasn't been approved
      this.ephemeral.seenWelcomeScreen = this.seenWelcomeScreen
      if (to && this.isLoggedIn) {
        this.navigateToGroupPage()
      }
    },
    isLoggedIn (to) {
      if (to && this.currentGroupId) {
        this.navigateToGroupPage()
      }
    }
  }
}: Object)
</script>

<style scoped lang="scss">
@import "@assets/style/_variables.scss";

.c-splash {
  display: flex;
  flex-direction: column;
  text-align: center;
  align-items: center;
  min-height: 100%;

  @include tablet {
    justify-content: center;
  }
}

.logo {
  width: 8rem;
  margin: 2rem auto;
}

.logo-2 {
  width: 8rem;
  margin: 0 auto 3rem auto;

  @include tablet {
    margin: 0;
    position: absolute;
    left: 1.5rem;
    top: 1.5rem;
  }
}

.is-subtitle {
  @include tablet {
    margin-top: 3rem;
  }

  @include desktop {
    margin-top: 0;
  }
}

.buttons {
  min-width: 230px;
}

.create-or-join {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  margin-top: 0.5rem;
  justify-content: center;
  text-align: left;
  @include tablet {
    text-align: center;
  }
}

.card {
  margin: 1.5rem 1.5rem 0 1.5rem;
  width: 100%;

  @include tablet {
    width: 24.375rem;
  }

  h3 {
    margin-bottom: 0.25rem;
  }

  svg {
    width: 6rem;
    margin-left: 1rem;
    float: right;
    @include tablet {
      float: none;
      width: 9.75rem;
      margin: 2.5rem auto 1.5rem auto;
    }
  }

  .button {
    margin-top: 2rem;

    @include tablet {
      margin-bottom: 1rem;
    }
  }
}

.c-footer {
  margin-top: 2.25rem;
  padding: 0 1rem;
  max-width: 31.25rem;
}

.c-demo-warning {
  text-align: left;
}

.c-pwa-promo {
  position: fixed;
  bottom: 1.875rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10; // should be less than modal, tooltip, prompt etc.
  text-align: left;
  width: calc(100vw - 3rem);
  max-width: 31.25rem;

  ::v-deep .c-body {
    margin-top: 1rem;
    text-align: right;
  }
}

.c-install-btn {
  padding-left: 1.75rem;
  padding-right: 1.75rem;
}
</style>
