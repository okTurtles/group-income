<template lang='pug'>
main.c-splash(data-test='homeLogo' v-if='!$store.state.currentGroupId')
  //- TODO: split this into two files, one showing the login/signup buttons
  //-       and the other showing the create/join group buttons!
  header(v-if='!$store.state.loggedIn' key='title-login')
    img.logo(src='/assets/images/group-income-icon-transparent.png')
    i18n(tag='h1' data-test='welcomeHome') Welcome to GroupIncome

  header(v-else key='title-not-login')
    img.logo-2(src='/assets/images/logo-transparent.png')
    i18n(tag='p' class='subtitle') Welcome to group income
    i18n(tag='h1' data-test='welcomeHomeLoggedIn') Let’s get this party started

  .buttons(v-if='!$store.state.loggedIn' key='body-loggin')
    i18n(
      tag='button'
      ref='loginBtn'
      @click='openModal("LoginModal")'
      data-test='loginBtn'
    ) Login

    i18n(
      tag='button'
      ref='signupBtn'
      @click='openModal("SignUp")'
      @keyup.enter='openModal("SignUp")'
      data-test='signupBtn'
      v-focus=''
    ) Signup

  .create-or-join(v-else key='body-create')
    .card
      svg-create-group
      h3 Create
      p Create a new group and invite your friends.

      i18n(
        tag='button'
        @click='openModal("CreateGroup")'
        data-test='createGroup'
        :aria-label='L("Add a group")'
      ) Create Group

    .card
      svg-join-group
      i18n(tag='h3') Join
      i18n(tag='p') Enter an existing group using your username.
      i18n(
        tag='button'
        @click='openModal("JoinGroup")'
        data-test='joinGroup'
      ) Join a Group

    .temp
      i18n(
        tag='button'
        @click='logout'
        data-test='logout'
      ) Logout

      router-link(
        to='/mailbox'
        icon='envelope'
        data-test='mailboxLink'
        class='button'
      )
        i18n Inbox
</template>

<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'
import SvgCreateGroup from '@svgs/create-group.svg'
import SvgJoinGroup from '@svgs/join-group.svg'

export default {
  name: 'Home',
  components: {
    SvgJoinGroup,
    SvgCreateGroup
  },
  mounted () {
    if (this.$route.query.next) {
      this.openModal('LoginModal')
    }
  },
  methods: {
    openModal (mode) {
      sbp('okTurtles.events/emit', OPEN_MODAL, mode)
    },
    logout () {
      sbp('state/vuex/dispatch', 'logout')
    }
  }
}
</script>

<style scoped lang="scss">
@import "../../assets/style/_variables.scss";

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

.subtitle {
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
  margin-top: $spacer-md;
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
    margin-left: $spacer;
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
      margin-bottom: $spacer;
    }
  }
}

.temp {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;

  > * {
    margin: $spacer-sm;
  }
}
</style>
