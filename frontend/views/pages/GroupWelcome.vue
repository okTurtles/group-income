<!-- sourcemap -->
<template lang="pug">
main.c-splash
  avatar.is-large(
    src='/assets/images/default-avatar.png'
    :alt='currentGroupState.groupName'
    :blobURL='currentGroupState.groupPicture'
  )

  h1
    i18n Welcome The Dreamers

  p.has-text-strong
    i18n You are now embarking on a new journey. We hope you have a blast!

  .buttons.is-centered
    button(
      :disabled='isButtonClicked'
      @click='toDashboard'
    )
      i18n Awesome
</template>

<script>
import Avatar from '@components/Avatar.vue'

export default {
  name: 'GroupWelcome',
  components: {
    Avatar
  },
  computed: {
    currentGroupState () {
      return this.$store.getters.currentGroupState
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
      this.$router.push({ path: '/dashboard' })
    }
  }
}
</script>

<style scoped>
.c-splash {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  border: 1px dashed rgba(170,20,25,0.25);

  > * {
    background: #000;
  }
}

.c-avatar {
  width: 156px;
}
</style>
