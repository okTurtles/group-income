<template lang='pug'>
main.c-splash(data-test='homeLogo')
  header(v-if='!$store.state.loggedIn')
    img.logo(src='/assets/images/group-income-icon-transparent.png')
    i18n(tag='h1' data-test='welcomeHome') Welcome to GroupIncome

  header(v-else)
    img.logo-2(src='/assets/images/logo-transparent.png')
    p.subtitle Welcome to group income
    i18n(tag='h1' data-test='welcomeHome') Let’s get this party started

  .buttons(v-if='!$store.state.loggedIn')
    i18n(
      tag='button'
      ref='loginBtn'
      :disabled='isModalOpen'
      @click='openModal("LoginModal")'
      data-test='loginBtn'
    ) Login

    i18n(
      tag='button'
      ref='signupBtn'
      @click='openModal("SignUp")'
      @keyup.enter='openModal("SignUp")'
      :disabled='isModalOpen'
      data-test='signupBtn'
    ) Signup

  .create-or-join(v-else)
    .card
      svg-create-group
      h3 Create
      p Create a new group and invite your friends.

      i18n(
        tag='button'
        @click='openModal("CreateGroup")'
        data-test='createGroup'
      ) Create Group

    .card
      svg-join-group
      h3 Join
      p Enter an existing group using your username.
      i18n(
        tag='button'
        @click='openModal("JoinGroup")'
        data-test='joinGroup'
      ) Join a Group
</template>

<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL, CLOSE_MODAL } from '@utils/events.js'
import SvgCreateGroup from '@svgs/create-group.svg'
import SvgJoinGroup from '@svgs/join-group.svg'

export default {
  name: 'Home',
  data () {
    return {
      isModalOpen: false,
      lastFocus: 'signupBtn'
    }
  },
  components: {
    SvgJoinGroup,
    SvgCreateGroup
  },
  mounted () {
    if (this.$route.query.next) {
      this.openModal('LoginModal')
    } else {
      if (!this.$store.state.loggedIn) {
        sbp('okTurtles.events/on', CLOSE_MODAL, this.enableSubmit)
        this.enableSubmit()
        // Fix firefox autofocus
        process.nextTick(() => this.$refs[this.lastFocus].$el.focus())
      }
    }
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', CLOSE_MODAL, this.enableSubmit)
  },
  methods: {
    openModal (mode) {
      if (!this.$store.state.loggedIn) {
        this.isModalOpen = true
        // Keep track of user last action
        this.lastFocus = mode === 'SignUp' ? 'signupBtn' : 'loginBtn'
      }
      sbp('okTurtles.events/emit', OPEN_MODAL, mode)
    },
    enableSubmit () {
      this.isModalOpen = false
      if (!this.$store.state.loggedIn) {
        // Enable focus on button and fix for firefox
        this.$nextTick(() => this.$refs[this.lastFocus].$el.focus())
      }
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
</style>
