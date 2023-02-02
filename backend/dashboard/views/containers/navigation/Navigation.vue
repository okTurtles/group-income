<template lang="pug">
nav.c-navigation(
  :class='{ "is-active": ephemeral.isActive }'
)
  .c-navigation-header
    h3.sr-only Navigation menu
    h3.is-title-4.c-header Navigation

    button.hide-tablet.is-icon.c-close-btn(@click='close') X

  ul.c-menu
    NavItem(v-for='item in ephemeral.navList' :key='item.id' v-bind='item')
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
          { id: 'contacts', name: L('Contacts'), to: '/contacts', icon: 'address-book' },
          { id: 'users', name: L('Users'), to: '/users', icon: 'users' },
          { id: 'accounts', name: L('Accounts'), to: '/accounts', icon: 'suitcase' },
          { id: 'billing', name: L('Billing'), to: '/billing', icon: 'list-bullets' }
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
  width: max-content;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid $border;
  border-left: 1px solid $border;
  background-color: $background_0;
}

.c-navigation-header {
  position: relative;
  align-items: center;
  padding: 0.35rem 0;

  @include tablet {
    padding: 1.5rem 0 0.5rem;
  }

  .c-close-btn {
    position: absolute;
    top: 50%;
    right: 0.75rem;
    transform: translateY(-50%);
  }
}

.c-header {
  position: relative;
  font-weight: 400;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  text-decoration: underline;
  color: $text_1;
  width: 100%;
  height: 2rem;
  line-height: 2rem;
  padding-left: 1.4rem;
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
