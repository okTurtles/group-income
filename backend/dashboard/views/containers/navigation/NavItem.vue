<template lang="pug">
  li.c-nav-item.has-text-bold(
    :class='{ "is-active": isActive }'
    @click='navigate'
  )
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
  computed: {
    isActive () {
      return this.$route.path === this.to
    }
  },
  methods: {
    navigate () {
      this.$router.push({ path: this.to })
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
  height: 3rem;
  padding: 0 1rem;
  font-size: $size_4;
  cursor: pointer;
  border-radius: 0.5rem;
  overflow: hidden;
  margin-bottom: 0.25rem;
  min-width: 12.5rem;

  &:hover,
  &.is-active {
    background-color: $background_active;
  }

  &.is-active::before {
    content: "";
    display: block;
    position: absolute;
    height: 100%;
    width: 8px;
    top: 0;
    left: 0;
    background-color: $text_1;
    border-radius: 8px;
  }

  &-icon {
    margin-top: 4px;
    flex-shrink: 0;
    font-size: 1.3em;
    line-height: 1.4;
  }
}

.is-active .c-nav-item-name {
  text-decoration: underline;
}
</style>
