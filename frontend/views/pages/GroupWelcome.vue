<template lang='pug'>
main.c-splash
  group-welcome
</template>

<script>
import GroupWelcome from '@components/GroupWelcome.vue'

export default {
  name: 'GroupWelcomePage',
  components: {
    GroupWelcome
  }
}
</script>

<style lang="scss" scoped>
.c-splash {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
</style>
