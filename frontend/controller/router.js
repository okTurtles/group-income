'use strict'

import Vue from 'vue'
import Router from 'vue-router'
import sbp from '~/shared/sbp.js'
import store from '@model/state.js'

import BypassUI from '@pages/BypassUI.vue'
import Home from '@pages/Home.vue'
import Join from '@pages/Join.vue'
import L from '@view-utils/translations.js'
import lazyLoadView from '@utils/lazyLoadedView.js'

/*
  Lazy load all the pages that are not necessary at initial loading off the app
  lazyLoadView function by default use the generic LoadingPage, but can be
  over written to show specific loading layout (same for the error page not yet implented)
*/
const GroupDashboard = lazyLoadView({ component: import('@pages/GroupDashboard.vue') })
const Messages = lazyLoadView({ component: import('@pages/Messages.vue') })
const Contributions = lazyLoadView({ component: import('@pages/Contributions.vue') })
const Payments = lazyLoadView({ component: import('@pages/Payments.vue') })
const GroupChat = lazyLoadView({ component: import('@pages/GroupChat.vue') })
const Mailbox = lazyLoadView({ component: import('@pages/Mailbox.vue') })
const GroupSettings = lazyLoadView({ component: import('@pages/GroupSettings.vue') })
const DesignSystem = lazyLoadView({ component: import('@pages/DesignSystem.vue') })

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
const router = new Router({
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
      component: DesignSystem,
      name: 'DesignSystem',
      meta: { title: L('Design System') }
      // beforeEnter: createEnterGuards(designGuard)
    },
    {
      path: '/bypass-ui',
      component: BypassUI,
      name: BypassUI.name,
      meta: { title: L('Cypress - BypassUI') }
    },
    {
      path: '/dashboard',
      component: () => GroupDashboard,
      name: 'GroupDashboard',
      meta: { title: L('Group Dashboard') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    {
      path: '/contributions',
      component: () => Contributions,
      name: 'Contributions',
      meta: { title: L('Contributions') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    {
      path: '/payments',
      component: () => Payments,
      name: 'Payments',
      meta: { title: L('Payments') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    /* Guards need to be created for any route that should not be directly accessed by url */
    {
      path: '/mailbox',
      component: () => Mailbox,
      name: 'Mailbox',
      meta: { title: L('Mailbox') },
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/messages',
      component: () => Messages,
      name: 'Messages',
      meta: { title: L('Messages') },
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/messages/:chatName',
      component: () => Messages,
      name: 'MessagesConversation',
      beforeEnter: createEnterGuards(loginGuard)
      // BUG/REVIEW "CANNOT GET /:username" when username has "." in it
      // ex: messages/joe.kim doesnt work but messages/joekim works fine.
      // Possible Solution: https://router.vuejs.org/guide/essentials/history-mode.html#example-server-configurations
    },
    {
      path: '/group-chat',
      component: () => GroupChat,
      name: 'GroupChat',
      meta: { title: L('Group Chat') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    {
      path: '/group-settings',
      component: () => GroupSettings,
      name: 'GroupSettings',
      meta: { title: L('Group Settings') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    {
      path: '/group-chat/:chatName',
      component: () => GroupChat,
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
    ...(process.env.NODE_ENV === 'development' && [{
      path: '/error-testing',
      name: 'ErrorTesting',
      component: () => import('../views/pages/ErrorTesting.vue'),
      meta: { title: L('Error Testing') }
    }]),
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
