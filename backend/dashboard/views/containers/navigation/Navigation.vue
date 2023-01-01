<template lang="pug">
nav.c-navigation(
  :class='{ "is-active": ephemeral.isActive }'
)
  .c-navigation-header
    h1.sr-only Navigation menu

    router-link(to='/home')
      img.c-logo(src='/assets/images/group-income-icon-transparent.png')

    h1.c-header Chelonia

  ul.c-menu
    li.c-nav-item(
      v-for='item in ephemeral.navList'
      :key='item.id'
    )
      router-link(:to='item.to') {{ item.name }}
</template>

<script>
export default {
  name: 'Navigation',
  data () {
    return {
      ephemeral: {
        isActive: false,
        navList: [
          { id: 'dashboard', name: 'Dashboard', to: '/' },
          { id: 'contacts', name: 'Contacts', to: '/contacts' },
          { id: 'users', name: 'Users', to: '/users' },
          { id: 'accounts', name: 'Accounts', to: '/accounts' },
          { id: 'billing', name: 'Billing', to: '/billing' }
        ]
      }
    }
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
