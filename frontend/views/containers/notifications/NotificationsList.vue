<template lang='pug'>
  ul
    // CONTINUE HERE + FAKE STORE.
    li Notification 1
    li Notification 2
    li Notification 3
    li Notification 4
    li Notification 4
    li Notification 4
    li Notification 4
    li Notification 4
    li Notification 4
    li Notification 4
    li Notification 4
    li Notification 6
    li Notification 7
    li Notification 8
    li Notification 9
</template>

<script>
export default {
  name: 'NotificationsList',
  components: {},
  computed: {}
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

li {
  min-height: 3rem;
  padding: 1rem;

  &:nth-child(even) {
    background-color: $general_2;
  }
}
</style>
