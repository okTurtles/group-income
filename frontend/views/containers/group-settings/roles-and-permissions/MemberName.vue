<template lang='pug'>
.c-member-name-and-id
  avatar-user.c-avatar(:contractID='memberID' size='sm')
  .c-member-details
    .c-member-display-name.has-ellipsis {{ userDisplayNameFromID(memberID) }}
    .c-member-username.has-ellipsis @{{ usernameFromID(memberID) }}
</template>

<script>
import AvatarUser from '@components/AvatarUser.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'MemberName',
  components: {
    AvatarUser
  },
  props: {
    memberID: String
  },
  computed: {
    ...mapGetters([
      'userDisplayNameFromID',
      'usernameFromID'
    ])
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-member-name-and-id {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 0.5rem;
  width: 100%;

  .c-avatar {
    flex-shrink: 0;
  }

  .c-member-details {
    position: relative;
    display: block;
    flex-grow: 1;
    max-width: calc(100% - 3rem);
    line-height: 1.2;

    .c-member-display-name {
      position: relative;
      font-weight: 600;
    }

    .c-member-username {
      position: relative;
      font-size: $size_5;
      color: $text_1;
    }
  }
}
</style>
