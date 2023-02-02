<template lang="pug">
nav.c-navigation(
  :class='{ "is-active": ephemeral.isActive }'
)
  .c-navigation-header
    h3.sr-only Navigation menu
    h3.is-title-4.c-header Navigation

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
    toHome () { this.$router.push({ path: '/' }) }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-navigation {
  padding: 1.5rem 0;
  width: max-content;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid $border;
  border-left: 1px solid $border;
  background-color: $background_0;
}

.c-navigation-header {
  display: block;
  margin-bottom: 1.25rem;
}

.c-header {
  position: relative;
  font-weight: 600;
  letter-spacing: 3px;
  display: flex;
  align-items: center;
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
