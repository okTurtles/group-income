'use strict'

import Vue from 'vue'
import Router from 'vue-router'
import sbp from '@sbp/sbp'
import store from '@model/state.js'

import Home from '@pages/Home.vue'
import Join from '@pages/Join.vue'
import L from '@view-utils/translations.js'
import { lazyPage } from '@utils/lazyLoadedView.js'

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
const lazyGroupSettings = lazyPage(() => import('@pages/GroupSettings.vue'))
const lazyMessages = lazyPage(() => import('@pages/Messages.vue'))
const lazyPayments = lazyPage(() => import('@pages/Payments.vue'))

Vue.use(Router)

/*
  The following are reusable guard for routes
  the 'guard' defines how the route is blocked and the redirect determines the redirect behavior
  when a route is blocked.
 */
const homeGuard = {
  guard: (to, from) => !!store.state.currentGroupId,
  redirect: (to, from) => ({ path: '/dashboard' })
}
const loginGuard = {
  guard: (to, from) => !store.state.loggedIn,
  // TODO/BUG "next" does not work.
  redirect: (to, from) => ({ path: '/', query: { next: to.path } })
}

const inviteGuard = {
  guard: (to, from) => {
    // ex: http://localhost:8000/app/join?groupId=21XWnNRE7vggw4ngGqmQz5D4vAwPYqcREhEkGop2mYZTKVkx8H&secret=5157
    return !(to.query.groupId && to.query.secret)
  },
  redirect: (to, from) => ({ path: '/' })
}

// Check if user has a group
const groupGuard = {
  guard: (to, from) => !store.state.currentGroupId,
  redirect: (to, from) => ({ path: '/' })
}

// TODO: add state machine guard and redirect to critical error page if necessary
// var mailGuard = {
//   guard: (to, from) => from.name !== Mailbox.name,
//   redirect: (to, from) => ({ path: '/mailbox' })
// }
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
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    {
      path: '/contributions',
      component: lazyContributions,
      name: 'Contributions',
      meta: { title: L('Contributions') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    {
      path: '/payments',
      component: lazyPayments,
      name: 'Payments',
      meta: { title: L('Payments') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    /* Guards need to be created for any route that should not be directly accessed by url */
    {
      path: '/messages',
      component: lazyMessages,
      name: 'Messages',
      meta: { title: L('Messages') },
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/messages/:chatName',
      component: lazyMessages,
      name: 'MessagesConversation',
      beforeEnter: createEnterGuards(loginGuard)
      // BUG/REVIEW "CANNOT GET /:username" when username has "." in it
      // ex: messages/joe.kim doesnt work but messages/joekim works fine.
      // Possible Solution: https://router.vuejs.org/guide/essentials/history-mode.html#example-server-configurations
    },
    {
      path: '/group-chat',
      component: lazyGroupChat,
      name: 'GroupChat',
      meta: { title: L('Group Chat') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    {
      path: '/group-settings',
      component: lazyGroupSettings,
      name: 'GroupSettings',
      meta: { title: L('Group Settings') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    {
      path: '/group-chat/:chatRoomId',
      component: lazyGroupChat,
      name: 'GroupChatConversation',
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    {
      path: '/join',
      name: Join.name,
      component: Join,
      meta: { title: L('Join a Group') },
      // beforeEnter: createEnterGuards(loginGuard, mailGuard)
      beforeEnter: createEnterGuards(inviteGuard)
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
  document.title = to.meta.title
  next()
})

sbp('sbp/selectors/register', {
  'controller/router': () => router
})

export default router
