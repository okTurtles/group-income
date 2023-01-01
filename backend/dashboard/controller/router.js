'use strict'

import Vue from 'vue'
import Router from 'vue-router'

// pages
import Dashboard from '@pages/Dashboard.vue'
import Contacts from '@pages/Contacts.vue'
import Users from '@pages/Users.vue'
import Accounts from '@pages/Accounts.vue'
import Billing from '@pages/Billing.vue'

Vue.use(Router)

const router = new Router({
  mode: 'history',
  base: '/dashboard',
  scrollBehavior (to, from, savedPosition) {
    return { x: 0, y: 0 }
  },
  routes: [
    {
      path: '/',
      meta: { title: 'Chelonia Dashboard' },
      name: 'Dashboard',
      component: Dashboard
    },
    {
      path: '/contacts',
      meta: { title: 'Contacts' },
      name: 'Contacts',
      component: Contacts
    },
    {
      path: '/users',
      meta: { title: 'Users' },
      name: 'Users',
      component: Users
    },
    {
      path: '/accounts',
      meta: { title: 'Accounts' },
      name: 'Accounts',
      component: Accounts
    },
    {
      path: '/billing',
      meta: { title: 'Billing' },
      name: 'Billing',
      component: Billing
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title
  next()
})

export default router
