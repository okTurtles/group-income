<template lang='pug'>
.c-voter-avatars(v-if='voters.length')
  avatar-user(v-for='username in voters'
    :key='username'
    :username='username'
    size='xs'
  )
</template>

<script>
import AvatarUser from '@components/AvatarUser.vue'

export default({
  name: 'VoterAvatars',
  components: {
    AvatarUser
  },
  props: {
    voters: Array
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-voter-avatars {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: max-content;
}
</style>

