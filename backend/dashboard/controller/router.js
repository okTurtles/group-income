'use strict'

import Vue from 'vue'
import Router from 'vue-router'

// pages
import Landing from '@pages/Landing.vue'
import Dashboard from '@pages/Dashboard.vue'
import Contracts from '@pages/Contracts.vue'
import Users from '@pages/Users.vue'
import Accounts from '@pages/Accounts.vue'
import Billing from '@pages/Billing.vue'
import DesignSystem from '@pages/design-system/CheloniaDesignSystem.vue'

import L from '@common/translations.js'

Vue.use(Router)

const router: any = new Router({
  mode: 'history',
  base: '/dashboard',
  scrollBehavior (to, from, savedPosition) {
    return { x: 0, y: 0 }
  },
  routes: [
    {
      path: '/',
      meta: { title: L('Chelonia dashboard') },
      name: 'Landing',
      component: Landing
    },
    {
      path: '/main',
      meta: { title: L('Dashboard') },
      name: 'Dashboard',
      component: Dashboard
    },
    {
      path: '/contracts',
      meta: { title: L('Contracts') },
      name: 'Contracts',
      component: Contracts
    },
    {
      path: '/users',
      meta: { title: L('Users') },
      name: 'Users',
      component: Users
    },
    {
      path: '/accounts',
      meta: { title: L('Accounts') },
      name: 'Accounts',
      component: Accounts
    },
    {
      path: '/billing',
      meta: { title: L('Billing') },
      name: 'Billing',
      component: Billing
    },
    {
      path: '/design-system',
      meta: { title: L('Design system') },
      name: 'DesignSystem',
      component: DesignSystem
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
