<template lang="pug">
.c-toolbar
  button.is-icon.hide-tablet.c-nav-menu(@click='$emit("open-nav")')
    i.icon-menu.c-menu-icon

  .c-app-title
    i.icon-moonstar.c-logo
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
  line-height: 1;
  margin-top: 2px;
  margin-right: 0.25rem;
}

.c-nav-menu {
  margin-right: 1rem;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 6px;
}

.c-menu-icon {
  display: inline-block;
  margin-top: 2px;
  font-size: 1.2rem;
}
</style>
