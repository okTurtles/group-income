<template lang='pug'>
.c-voter-avatars(v-if='voters.length')
  template(v-for='entry in votersToDisplay')
    .c-number-avatar(v-if='isNum(entry)') +{{ entry }}
    avatar-user.c-user-avatar(v-else :key='entry' :username='entry' size='xs')
</template>

<script>
import AvatarUser from '@components/AvatarUser.vue'

export default ({
  name: 'VoterAvatars',
  components: {
    AvatarUser
  },
  props: {
    voters: Array
  },
  computed: {
    votersToDisplay () {
      const restNum = this.voters.length - 2

      return [
        restNum > 0 && restNum,
        ...this.voters.slice(0, 2)
      ].filter(Boolean)
    }
  },
  methods: {
    isNum (val) {
      return typeof val === 'number'
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-voter-avatars {
  position: relative;
  display: inline-flex;
  flex-direction: row-reverse;
  align-items: center;
  width: max-content;
}

.c-number-avatar,
.c-user-avatar {
  &:not(:last-child) {
    margin-left: -0.375rem;
  }
}

.c-user-avatar {
  border: 2px solid $background_0;
}

.c-number-avatar {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  font-size: $size_5;
  color: $text_0;
  background-color: $general_1;
}
</style>
