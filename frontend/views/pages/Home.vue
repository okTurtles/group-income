<template lang='pug'>
main.c-splash(data-test='homeLogo')
  header
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
      img(src='/assets/images/create-a-group.png')
      h3 Create
      p Create a new group and invite your friends.
      router-link.button(
        data-test='createGroup'
        to='new-group'
      )
        i18n Create Group

    .card
      img(src='/assets/images/join-a-group.png')
      h3 Join
      p Enter an existing group using your username.
      router-link.button(
        data-test='joinGroup'
        to='join-group'
      )
        i18n Join a Group
</template>

<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL, CLOSE_MODAL } from '@utils/events.js'

export default {
  name: 'Home',
  data () {
    return {
      isModalOpen: false,
      lastFocus: 'signupBtn'
    }
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
      this.isModalOpen = true
      // Keep track of user last action
      this.lastFocus = mode === 'SignUp' ? 'signupBtn' : 'loginBtn'
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
  justify-content: center;
  text-align: center;
  align-items: center;
  min-height: 100%;
}

.logo {
  width: 8rem;
}

.buttons {
  min-width: 230px;
}

.create-or-join {
  display: flex;
  justify-content: center;
  width: 100%;
  flex-wrap: wrap;
  margin-top: $spacer-md;
}

.card {
  margin: 1.5rem;
  width: 24.375rem;
  max-width: 100%;

  h3 {
    margin-bottom: 0.25rem;
  }

  img {
    width: 9.75rem;
    margin: 2.5rem auto 1.5rem auto;
  }

  .button {
    margin-top: 2rem;
    margin-bottom: $spacer;
  }
}
</style>
