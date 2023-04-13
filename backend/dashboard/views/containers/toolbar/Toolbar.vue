<template lang="pug">
.c-toolbar
  .c-flex-block
    button.is-icon.hide-tablet.c-nav-menu(v-if='!noNavigation' @click='$emit("open-nav")')
      i.icon-menu.c-btn-icon

    .c-app-title
      i.icon-moonstar.c-logo
      i18n.is-title-3(tag='h1' @click='$router.push({ path: "/main" })') Chelonia

  .c-flex-block
    button.is-icon.c-theme-toggle(@click='toggleTheme')
      i(:class='`icon-${themeToggleIcon} c-btn-icon`')
</template>

<script>
import { mapState } from 'vuex'
import { THEME_LIGHT, THEME_DARK } from '@model/themes.js'

export default {
  name: 'Toolbar',
  props: {
    noNavigation: Boolean
  },
  computed: {
    ...mapState(['theme']),
    themeToggleIcon () {
      return this.theme === THEME_LIGHT ? 'moon' : 'sun'
    }
  },
  methods: {
    toggleTheme () {
      this.$store.commit('setTheme', this.theme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-toolbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid $border;
  padding: 0 1rem;
  opacity: 0;
  animation: opacity-in 500ms ease-out forwards;
}

.c-flex-block {
  display: flex;
  align-items: center;
}

.c-app-title {
  h1 {
    display: inline-block;
    letter-spacing: 1px;
    cursor: pointer;
    @extend %unselectable;
  }

  .c-logo {
    position: relative;
    display: inline-block;
    color: inherit;
    font-weight: 600;
    font-size: 1.5rem;
    line-height: 1;
    margin-right: 0.25rem;
    transform: translateY(4px);
  }
}

.c-nav-menu {
  margin-right: 1rem;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 6px;
}

.c-btn-icon {
  display: inline-block;
  margin-top: 2px;
  font-size: 1.2rem;
}
</style>
