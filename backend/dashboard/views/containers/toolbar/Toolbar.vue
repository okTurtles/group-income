<template lang="pug">
.c-toolbar
  button.is-icon.hide-tablet.c-nav-menu-icon(@click='$emit("open-nav")')
    i.icon-list-checks

  .c-app-title
    i.icon-suitcase.c-logo
    h1.is-title-3 Chelonia

</template>

<script>
export default {
  name: 'Toolbar'
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-toolbar {
  position: relative;
  display: flex;
  align-items: center;
  border-bottom: 1px solid $border;
  padding: 0 1rem;
}

.c-app-title {
  display: flex;
  align-items: center;

  h1 {
    letter-spacing: 1px;
  }
}

.c-logo {
  display: inline-block;
  font-weight: 600;
  font-size: 1.5rem;
  margin-right: 0.25rem;
}

.c-nav-menu-icon {
  margin-right: 1rem;
  width: 1.75rem;
  height: 1.75rem;
  font-size: 0.675rem;
  border-radius: 6px;
}
</style>
