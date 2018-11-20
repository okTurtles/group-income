<template>
  <div class="c-message">
    <!--
      TODO/REVIEW the idea would be to use <component :is="type">
      to get the interaction's type and each state based on a id
      Do it another PR, since is not critical to Chatroom's and still needs to
      studied: all interaction types and each one state.
    -->
    <template>
      An interactive action would be here...
      <br /> Accept an invite or vote on a proposal
    </template>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-message {
  display: inline-block;
  margin: $gi-spacer $gi-spacer-sm 0;
  max-width: 32rem;
  border: 1px dashed $primary;
  border-radius: $radius-large;
  padding: $gi-spacer $gi-spacer-sm;

  &:last-of-type {
    margin-bottom: $gi-spacer;
  }

  @include phablet {
    padding: $gi-spacer;
    margin: $gi-spacer $gi-spacer 0;
  }
}
</style>
<script>
export default {
  name: 'MessageInteractive',
  props: {
    id: String
  }
}
</script>
