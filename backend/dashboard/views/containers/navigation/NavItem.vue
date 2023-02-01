<template lang="pug">
  li.c-nav-item.has-text-bold(@click='navigateTo(to)')
    i(:class='`icon-${icon} is-prefix c-nav-item-icon`')
    span.c-nav-item-name {{ name }}
</template>

<script>
export default {
  name: 'NavItem',
  props: {
    to: String,
    name: String,
    icon: String
  },
  methods: {
    navigateTo (to) {
      this.$router.push({ path: to })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-nav-item {
  position: relative;
  display: flex;
  align-items: center;
  height: 3.6rem;
  padding: 0 1.4rem;
  font-size: 1rem;
  cursor: pointer;
  border-bottom: 1px solid $border;
  border-top: 1px solid $border;
  margin-bottom: 4px;

  @include from($desktop) {
    min-width: 17.5rem;
  }

  &-icon {
    margin-top: 4px;
    flex-shrink: 0;
    font-size: 1.3em;
    line-height: 1.4;
  }

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    display: block;
    width: 10px;
    height: 100%;
    background-color: $primary_purple;
  }
}
</style>
