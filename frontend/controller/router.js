'use strict'

import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import Router from 'vue-router'
import store from '~/frontend/model/state.js'
import Home from '@pages/Home.vue'
import Join from '@pages/Join.vue'
import { lazyPage } from '@utils/lazyLoadedView.js'
import Vue from 'vue'

/*
 * Lazy load all the pages that are not necessary at initial loading of the app.
 *
 * By default `lazyPage()` will use the generic `LoadingPage` and `ErrorPage` components,
 * but other components can be specified using the `loading` and `error` options.
 */
const lazyContributions = lazyPage(() => import('@pages/Contributions.vue'))
const lazyDesignSystem = lazyPage(() => import('@pages/DesignSystem.vue'))
const lazyGroupChat = lazyPage(() => import('@pages/GroupChat.vue'))
const lazyGroupDashboard = lazyPage(() => import('@pages/GroupDashboard.vue'))
const lazyGlobalDashboard = lazyPage(() => import('@pages/GlobalDashboard.vue'))
const lazyGroupSettings = lazyPage(() => import('@pages/GroupSettings.vue'))
const lazyPayments = lazyPage(() => import('@pages/Payments.vue'))
const lazyPendingApproval = lazyPage(() => import('@pages/PendingApproval.vue'))

Vue.use(Router)

/*
  The following are reusable guard for routes
  the 'guard' defines how the route is blocked and the redirect determines the redirect behavior
  when a route is blocked.
 */
const homeGuard = {
  guard: (to, from) => !!store.state.currentGroupId,
  redirect: (to, from) => {
    return ({
      path:
      // If we haven't accepted the invite OR we haven't clicked 'Awesome' on
      // the welcome screen, redirect to the '/pending-approval' page
      store.getters.seenWelcomeScreen
        ? '/dashboard'
        : '/pending-approval'
    })
  }
}

const loginGuard = {
  guard: (to, from) => !store.state.loggedIn,
  redirect: (to, from) => ({ path: '/', query: { next: to.fullPath } })
}

const inviteGuard = {
  guard: (to, from) => {
    // ex: http://localhost:8000/app/join#?groupId=21XWnNRE7vggw4ngGqmQz5D4vAwPYqcREhEkGop2mYZTKVkx8H&secret=5157
    return !(to.hash.includes('groupId=') && to.hash.includes('secret='))
  },
  redirect: (to, from) => ({ path: '/' })
}

// Check if user has a group
const groupGuard = {
  guard: (to, from) => !store.state.currentGroupId,
  redirect: (to, from) => ({ path: '/' })
}

const pendingApprovalGuard = {
  guard: (to, from) => store.state.currentGroupId && !store.getters.ourProfileActive,
  redirect: (to, from) => ({ path: '/pending-approval' })
}

// TODO: add state machine guard and redirect to critical error page if necessary
function createEnterGuards (...guards) {
  return function (to, from, next) {
    for (const current of guards) {
      if (current.guard(to, from)) {
        return next(current.redirect(to, from))
      }
    }
    next()
  }
}

const router: any = new Router({
  mode: 'history',
  base: '/app',
  scrollBehavior (to, from, savedPosition) {
    return { x: 0, y: 0 }
  },
  routes: [
    {
      path: '/',
      component: Home,
      name: 'home',
      meta: { title: L('Group Income') }, // page title. see issue #45
      beforeEnter: createEnterGuards(homeGuard)
    },
    {
      path: '/design-system',
      component: lazyDesignSystem,
      name: 'DesignSystem',
      meta: { title: L('Design System') }
      // beforeEnter: createEnterGuards(designGuard)
    },
    {
      path: '/dashboard',
      component: lazyGroupDashboard,
      name: 'GroupDashboard',
      meta: { title: L('Group Dashboard') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard, pendingApprovalGuard)
    },
    {
      path: '/global-dashboard/:id',
      component: lazyGlobalDashboard,
      name: 'GlobalDashboard',
      meta: { title: L('Global Dashboard') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    {
      path: '/global-dashboard', redirect: '/global-dashboard/news-and-updates'
    },
    {
      path: '/contributions',
      component: lazyContributions,
      name: 'Contributions',
      meta: { title: L('Contributions') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard, pendingApprovalGuard)
    },
    {
      path: '/payments',
      component: lazyPayments,
      name: 'Payments',
      meta: { title: L('Payments') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard, pendingApprovalGuard)
    },
    {
      path: '/group-chat',
      component: lazyGroupChat,
      name: 'GroupChat',
      meta: { title: L('Group Chat') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard, pendingApprovalGuard)
    },
    {
      path: '/group-chat/:chatRoomID',
      component: lazyGroupChat,
      name: 'GroupChatConversation',
      meta: { title: L('Loading') },
      /**
       * The weird title `Loading` is used as title until the page is loaded
       * Chatroom details could be retrieved from the backend using it's id(chatRoomID)
       * So until that time, chatroom name is unknown and could display `Loading`
       */
      beforeEnter: createEnterGuards(loginGuard, groupGuard, pendingApprovalGuard)
    },
    {
      path: '/group-settings',
      component: lazyGroupSettings,
      name: 'GroupSettings',
      meta: { title: L('Group Settings') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard, pendingApprovalGuard)
    },
    {
      path: '/group-settings/:tabId',
      component: lazyGroupSettings,
      name: 'GroupSettingsTab',
      meta: { title: L('Group Settings') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard, pendingApprovalGuard)
    },
    {
      path: '/join',
      name: Join.name,
      component: Join,
      meta: { title: L('Join a Group') },
      beforeEnter: createEnterGuards(inviteGuard)
    },
    {
      path: '/pending-approval',
      component: lazyPendingApproval,
      name: 'PendingApproval',
      meta: { title: L('Pending Approval') },
      beforeEnter: createEnterGuards(loginGuard)
    },
    ...(process.env.NODE_ENV === 'development'
      ? [{
          path: '/error-testing',
          name: 'ErrorTesting',
          component: () => import('../views/pages/ErrorTesting.vue'),
          meta: { title: L('Error Testing') }
        }]
      : []),
    {
      path: '*',
      redirect: '/'
    }
  ]
})

router.beforeEach((to, from, next) => {
  if (to.query.modal &&
    !['Prompt', 'SignupModal', 'LoginModal', 'LoginErrorModal'].includes(to.query.modal) &&
    !store.state.loggedIn) {
    // if modal is queried and,
    // the requested modal is only meant to be used post authentication and
    // the user is not logged in now, navigate to home page and set the next query param
    // to redirect to the requested page after login.
    return next({ path: '/', query: { next: to.fullPath } })
  }

  document.title = to.meta.title
  next()
})

sbp('sbp/selectors/register', {
  'controller/router': () => router
})

export default router
