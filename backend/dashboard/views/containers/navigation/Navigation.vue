<template lang="pug">
nav.c-navigation(
  :class='{ "is-active": ephemeral.isActive }'
)
  .c-navigation-header
    h1.sr-only Navigation menu
    h1.c-header(@click='toHome') Chelonia

  ul.c-menu
    li.c-nav-item(
      v-for='item in ephemeral.navList'
      :key='item.id'
    )
      router-link(:to='item.to') {{ item.name }}
</template>

<script>
import L from '@common/translations.js'

export default {
  name: 'Navigation',
  data () {
    return {
      ephemeral: {
        isActive: false,
        navList: [
          { id: 'dashboard', name: L('Dashboard'), to: '/' },
          { id: 'contacts', name: L('Contacts'), to: '/contacts' },
          { id: 'users', name: L('Users'), to: '/users' },
          { id: 'accounts', name: L('Accounts'), to: '/accounts' },
          { id: 'billing', name: L('Billing'), to: '/billing' }
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
.c-navigation {
  background-color: #e6ebef;
  padding: 3rem 1.5rem;
  width: 17.5rem;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.c-navigation-header {
  display: flex;
  align-items: center;
  margin-bottom: 2.25rem;
}

.c-header {
  font-size: 1.4rem;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.c-logo {
  display: inline-block;
  width: 1.6rem;
  margin-right: 0.75rem;
}

.c-nav-item {
  margin-bottom: 0.25rem;
  font-size: 1rem;

  > a {
    text-decoration: none;
    color: #000;
    cursor: pointer;

    &.router-link-exact-active {
      font-weight: 600;
    }
  }
}
</style>
