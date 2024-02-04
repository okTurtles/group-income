<template lang='pug'>
main.c-splash(data-test='homeLogo' v-if='!$store.state.currentGroupId')
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

  footer.c-footer(v-if='!isLoggedIn')
    banner-simple.c-demo-warning(severity='warning')
      i18n(
        :args='{ a_:`<a class="link" href="https://groupincome.org/beta-testing/" target="_blank">`, _a: "</a>" }'
      ) This is a beta-testing site. Groups will have to be re-created when we enable end-to-end encryption. {a_}Read more.{_a}
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters, mapState } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import BannerSimple from '@components/banners/BannerSimple.vue'
import SvgCreateGroup from '@svgs/create-group.svg'
import SvgJoinGroup from '@svgs/join-group.svg'

export default ({
  name: 'Home',
  components: {
    SvgJoinGroup,
    SvgCreateGroup,
    BannerSimple
  },
  computed: {
    ...mapGetters([
      'ourGroupProfile'
    ]),
    ...mapState([
      'currentGroupId'
    ]),
    isLoggedIn () {
      return this.$store.state.loggedIn
    }
  },
  mounted () {
    if (this.currentGroupId) {
      this.navigateToGroupPage()
    } else if (this.$route.query.next) {
      this.openModal('LoginModal')
    }
  },
  methods: {
    openModal (mode) {
      sbp('okTurtles.events/emit', OPEN_MODAL, mode)
    },
    navigateToGroupPage () {
      this.$router.push({
        // NOTE:
        // When browser refresh is triggered, there is an issue that Vue router prematurely decides ('loginGuard' there) that
        // the user is not signed in when in actual reality user-login is still being processed and then
        // takes user to 'Home.vue' with the '$route.query.next' being set to the initial url.
        // In this particular condition, the app needs to immediately redirect user to '$route.query.next'
        // so that the user stays in the same page after the browser refresh.
        // (Related GH issue: https://github.com/okTurtles/group-income/issues/1830)
        path: this.$route.query.next ?? (
          this.ourGroupProfile
            ? '/dashboard'
            : '/pending-approval'
        )
      }).catch(console.warn)
    }
  },
  watch: {
    currentGroupId (to) {
      if (to) {
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
</style>
