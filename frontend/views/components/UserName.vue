<template lang='pug'>
.c-name(data-test='username')
  strong.has-ellipsis {{ displayName ? displayName : '@' + username }}
  .c-display-name(
    data-test='profileName'
    v-if='displayName'
  ) @{{ username }}
</template>

<script>
import { mapGetters } from 'vuex'

export default ({
  name: 'UserName',
  props: {
    contractID: String
  },
  computed: {
    ...mapGetters([
      'globalProfile',
      'usernameFromID'
    ]),
    username () {
      return this.usernameFromID(this.contractID)
    },
    displayName () {
      return this.globalProfile(this.contractID).displayName
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-name {
  display: flex;
  flex-direction: column;
  padding-left: 1rem;
  font-size: $size_4;
  flex-grow: 1;
  width: calc(100% - 4.5rem);

  strong {
    position: relative;
    width: 100%;
    font-size: $size_2;
    color: $text_0;
    font-family: Poppins;

    @include phone {
      width: calc(100% - 2.75rem);
    }
  }
}

.c-display-name {
  color: $text_1;
}
</style>
