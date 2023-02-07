<template lang="pug">
nav.c-navigation(:class='{ "is-active": ephemeral.isActive }')
  .c-navigation-wrapper
    .c-navigation-header
      h3.sr-only Navigation menu
      i18n.section-title.c-header Navigation

      button.hide-tablet.is-icon.c-close-btn(@click='close')
        i.icon-cross

    ul.c-menu
      NavItem(v-for='item in ephemeral.navList'
        :key='item.id'
        v-bind='item'
        @navigate='close'
      )

  .c-navigation-overlay(@click='close')
</template>

<script>
import L from '@common/translations.js'
import NavItem from './NavItem.vue'

export default {
  name: 'Navigation',
  components: {
    NavItem
  },
  data () {
    return {
      ephemeral: {
        isActive: false,
        navList: [
          { id: 'dashboard', name: L('Dashboard'), to: '/', icon: 'chalkboard' },
          { id: 'contracts', name: L('Contracts'), to: '/contracts', icon: 'network' },
          { id: 'users', name: L('Users'), to: '/users', icon: 'users' },
          { id: 'accounts', name: L('Accounts'), to: '/accounts', icon: 'address-book' },
          { id: 'billing', name: L('Billing'), to: '/billing', icon: 'currency-circle' }
        ]
      }
    }
  },
  methods: {
    toHome () { this.$router.push({ path: '/' }) },
    open () {
      this.ephemeral.isActive = true
    },
    close () {
      this.ephemeral.isActive = false
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-navigation {
  overflow-y: auto;
  overflow-x: hidden;
  width: 100vw;

  @include tablet {
    width: 100%;
  }
}

.c-navigation-wrapper {
  background-color: $background_0;
  border-right: 1px solid $border;
  border-left: 1px solid $border;
  width: max-content;
  height: 100%;
}

.c-navigation-overlay {
  display: block;
  background-color: rgba(0, 0, 0, 0);

  .is-active & {
    flex-grow: 1;
  }
}

.c-navigation-header {
  position: relative;
  display: flex;
  padding: 0.7rem 0;

  @include tablet {
    padding: 1.75rem 0 0.75rem;
  }

  .c-close-btn {
    position: absolute;
    top: 50%;
    right: 0.75rem;
    transform: translateY(-50%);
    width: 1.75rem;
    height: 1.75rem;

    i {
      display: inline-block;
      font-size: 1rem;
      margin-top: 2px;
    }
  }
}

.c-header {
  position: relative;
  display: block;
  letter-spacing: 1px;
  width: 100%;
  padding-left: 1.4rem;
  margin-bottom: 0;
  font-size: 1em;
}

.c-logo {
  display: inline-block;
  width: 1.6rem;
  margin-right: 0.75rem;
}

.c-menu {
  padding: 2.25rem 0.75rem 0;
  border-top: 1px solid $border;
}
</style>
