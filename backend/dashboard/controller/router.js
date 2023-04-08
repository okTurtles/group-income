'use strict'

import Vue from 'vue'
import Router from 'vue-router'

import Landing from '@pages/miscellaneous/Landing.vue'
import L from '@common/translations.js'
import { lazyPage } from '@view-utils/lazyLoadComponents.js'

const lazyDashboard = lazyPage(() => import('@pages/Dashboard.vue'))
const lazyContracts = lazyPage(() => import('@pages/Contracts.vue'))
const lazyUsers = lazyPage(() => import('@pages/Users.vue'))
const lazyBilling = lazyPage(() => import('@pages/Billing.vue'))
const lazyAccounts = lazyPage(() => import('@pages/Accounts.vue'))
const lazyDesignSystem = lazyPage(() => import('@pages/design-system/CheloniaDesignSystem.vue'))

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
      component: lazyDashboard
    },
    {
      path: '/contracts',
      meta: { title: L('Contracts') },
      name: 'Contracts',
      component: lazyContracts
    },
    {
      path: '/users',
      meta: { title: L('Users') },
      name: 'Users',
      component: lazyUsers
    },
    {
      path: '/accounts',
      meta: { title: L('Accounts') },
      name: 'Accounts',
      component: lazyAccounts
    },
    {
      path: '/billing',
      meta: { title: L('Billing') },
      name: 'Billing',
      component: lazyBilling
    },
    {
      path: '/design-system',
      meta: { title: L('Design system') },
      name: 'DesignSystem',
      component: lazyDesignSystem
    },
    {
      path: '*',
      redirect: '/main'
    }
  ]
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title
  next()
})

export default router
