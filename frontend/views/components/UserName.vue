<template lang='pug'>
.c-name(data-test='username')
  strong {{ displayName ? displayName : '@' + username }}
  .c-display-name(
    data-test='profileName'
    v-if='displayName'
  ) @{{ username }}
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'UserName',
  props: {
    username: String
  },
  computed: {
    ...mapGetters([
      'globalProfile'
    ]),
    displayName () {
      return this.globalProfile(this.username).displayName
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-name {
  display: flex;
  flex-direction: column;
  padding-left: 1rem;
  font-size: 1rem;

  strong {
    font-size: $size_2;
    color: $text_0;
    font-family: poppins;
  }
}

.c-display-name {
  color: $text_1;
}

</style>
