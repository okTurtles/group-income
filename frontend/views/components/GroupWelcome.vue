<template lang='pug'>
.wrapper(data-test='welcome')
  avatar(
    :src='groupSettings.groupPicture'
    :aria-label='L("{groupName}\'s avatar", { groupName: groupSettings.groupName })'
    size='xl'
  )

  i18n.is-title-1.c-title(
    tag='h1'
    data-test='welcomeGroup'
    :args='{ groupName: groupSettings.groupName }'
  ) Welcome to {groupName}!

  i18n(tag='p' class='has-text-0 c-description') You are now embarking on a new journey. We hope you have a blast!

  .buttons.is-centered
    i18n(
      tag='button'
      :disabled='isButtonClicked'
      @click='toDashboard'
      data-test='toDashboardBtn'
    ) Awesome

  confetti-animation
</template>

<script>
import Avatar from '@components/Avatar.vue'
import ConfettiAnimation from '@components/confetti-animation/ConfettiAnimation.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'GroupWelcome',
  components: {
    Avatar,
    ConfettiAnimation
  },
  props: {
    // Passed from CreateGroup.vue. Prevent from attaching it to the DOM.
    $v: { type: Object }
  },
  computed: {
    ...mapGetters(['groupSettings'])
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
      this.$router.push({ path: '/dashboard' })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;

  @include phone {
    justify-content: left;
    padding-left: 1rem;
  }

  .c-title,
  .c-description {
    text-align: center;
    padding: 0 1rem;
  }

  .c-title {
    margin-top: 1rem;
  }

  .c-description {
    margin: 0 0 0.5rem;

    @include phone {
      position: absolute;
      top: 5.5rem;
    }
  }

  @include phone {
    width: 100vw;
  }
}
</style>
