<template lang="pug">
nav.c-navigation(
  :class='{ "is-active": ephemeral.isActive }'
)
  .c-navigation-header
    h1.sr-only Navigation menu
    h1.c-header.is-title-1(@click='toHome') Chelonia

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
  padding: 3rem 0;
  width: max-content;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid $border;
  background-color: $background_0;
}

.c-navigation-header {
  display: flex;
  align-items: center;
  margin-bottom: 2.25rem;
}

.c-header {
  font-size: 1.4rem;
  cursor: pointer;
  width: 100%;
  padding-left: 1.4rem;

  &:hover {
    text-decoration: underline;
  }
}

.c-logo {
  display: inline-block;
  width: 1.6rem;
  margin-right: 0.75rem;
}
</style>
