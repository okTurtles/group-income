<template lang="pug">
.c-message
  //
    TODO/REVIEW the idea would be to use component(:is='type')
    to get the interaction's type and each state based on a id
    Do it another PR, since is not critical to Chatroom's and still needs to
    studied: all interaction types and each one state.

  | An interactive action would be here...
  br
  |  Accept an invite or vote on a proposal

</template>

<script>
export default {
  name: 'MessageInteractive',
  props: {
    id: String
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

</style>
