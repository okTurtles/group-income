<template lang='pug'>
.c-chatnav
  slot
</template>

<script>
export default ({
  name: 'ChatNav'
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-chatnav {
  ::v-deep .c-item-link {
    padding: 0.5rem 0 0.5rem 0.5rem;
    margin: 0 0 0 -0.5rem;
    border-radius: $radius;

    i {
      margin-right: 1.5rem;
    }

    &.is-active {
      background: $background_0;

      &::before {
        display: none;
      }
    }
  }

  ::v-deep .c-avatar {
    margin-right: 0.5rem;
  }
}
</style>
