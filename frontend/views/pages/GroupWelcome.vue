<template lang="pug">
main.c-splash(
  data-test='welcome'
)
  avatar(
    src='/assets/images/default-avatar.png'
    :alt='userName'
    :blobURL='userPicture'
  )

  h1.c-title
    i18n Welcome {{ userName }}!

  p.has-text-dark.c-description
    i18n You are now embarking on a new journey. We hope you have a blast!

  .buttons.is-centered
    button(
      :disabled='isButtonClicked'
      @click='toDashboard'
      data-test='toDashboardBtn'
    )
      i18n Awesome

  confetti-animation
</template>

<script>
import Avatar from '@components/Avatar.vue'
import ConfettiAnimation from '@components/ConfettiAnimation/ConfettiAnimation.vue'

export default {
  name: 'GroupWelcome',
  components: {
    Avatar,
    ConfettiAnimation
  },
  computed: {
    userName () {
      return this.$store.getters.currentGroupState.groupName
    },
    userPicture () {
      return this.$store.getters.currentGroupState.groupPicture
    }
  },
  data () {
    return {
      isButtonClicked: false
    }
  },
  methods: {
    toDashboard () {
      if (this.isButtonClicked) return

      this.isButtonClicked = true
      this.$router.replace({ path: '/dashboard' })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-splash {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;

  .c-avatar {
    height: 128px;
    width: 128px;
  }

  .c-title,
  .c-description {
    text-align: center;
    word-break: keep-all;
    padding: 0 16px;
  }

  .c-title {
    margin-bottom: 0;

    @include phone {
      font-size: $size-2;
    }
  }

  .c-description {
    margin: 0 0 8px;
  }

  @include phone {
    width: 100vw;
  }
}
</style>
