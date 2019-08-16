<template lang="pug">
main.c-splash(data-test='homeLogo')
  img.logo(src='/assets/images/group-income-icon-transparent.png')
  h1
    i18n Welcome to GroupIncome

  .buttons(v-if='!$store.state.loggedIn')
    i18n(
      tag='button'
      ref='loginBtn'
      :disabled='isModalOpen'
      @click="openModal('LoginModal')"
      data-test='loginBtn'
    ) Login

    i18n(
      tag='button'
      ref='signupBtn'
      @click="openModal('SignUp')"
      @keyup.enter="openModal('SignUp')"
      :disabled='isModalOpen'
      data-test='signupBtn'
    ) Signup

  router-link.button(
    v-else=''
    data-test='createGroup'
    to='new-group'
  )
    i18n Start a Group
</template>

<script>
import sbp from '~/shared/sbp.js'
import { LOAD_MODAL, UNLOAD_MODAL } from '@utils/events.js'

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
        sbp('okTurtles.events/on', UNLOAD_MODAL, this.enableSubmit)
        this.enableSubmit()
        // Fix firefox autofocus
        process.nextTick(() => this.$refs[this.lastFocus].$el.focus())
      }
    }
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', UNLOAD_MODAL, this.enableSubmit)
  },
  methods: {
    openModal (mode) {
      this.isModalOpen = true
      // Keep track of user last action
      this.lastFocus = mode === 'SignUp' ? 'signupBtn' : 'loginBtn'
      sbp('okTurtles.events/emit', LOAD_MODAL, mode)
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
  align-items: center;
  min-height: 100%;
}

.logo {
  width: 8rem;
}

.buttons {
  min-width: 230px;
}
</style>
