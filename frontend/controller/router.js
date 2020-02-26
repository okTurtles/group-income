'use strict'

import Vue from 'vue'
import Router from 'vue-router'
import sbp from '~/shared/sbp.js'
import store from '@model/state.js'

import DesignSystem from '@pages/DesignSystem.vue'
import BypassUI from '@pages/BypassUI.vue'

import Home from '@pages/Home.vue'
import Messages from '@pages/Messages.vue'
import GroupDashboard from '@pages/GroupDashboard.vue'
import Contributions from '@pages/Contributions.vue'
import PayGroup from '@pages/PayGroup.vue'
import GroupChat from '@pages/GroupChat.vue'
import Join from '@pages/Join.vue'
import Mailbox from '@pages/Mailbox.vue'
import GroupSettings from '@pages/GroupSettings.vue'
import L from '@view-utils/translations.js'

Vue.use(Router)

/*
 The following are reusable guard for routes
 the 'guard' defines how the route is blocked and the redirect determines the redirect behavior
 when a route is blocked
 */
const homeGuard = {
  guard: (to, from) => !!store.state.currentGroupId,
  redirect: (to, from) => ({ path: '/dashboard' })
}
const loginGuard = {
  guard: (to, from) => !store.state.loggedIn,
  redirect: (to, from) => ({ path: '/', query: { next: to.path } })
}

var inviteGuard = {
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
      name: DesignSystem.name,
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
      component: GroupDashboard,
      name: GroupDashboard.name,
      meta: { title: L('Group Dashboard') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    {
      path: '/contributions',
      component: Contributions,
      meta: { title: L('Contributions') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    {
      path: '/pay-group',
      component: PayGroup,
      meta: { title: L('Pay Group') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    /* Guards need to be created for any route that should not be directly accessed by url */
    {
      path: '/mailbox',
      name: Mailbox.name,
      component: Mailbox,
      meta: { title: L('Mailbox') },
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/messages',
      name: 'Messages',
      component: Messages,
      meta: { title: L('Messages') },
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/messages/:chatName',
      name: 'MessagesConversation',
      component: Messages,
      beforeEnter: createEnterGuards(loginGuard)
      // BUG/REVIEW "CANNOT GET /:username" when username has "." in it
      // ex: messages/joe.kim doesnt work but messages/joekim works fine.
      // Possible Solution: https://router.vuejs.org/guide/essentials/history-mode.html#example-server-configurations
    },
    {
      path: '/group-chat',
      component: GroupChat,
      name: 'GroupChat',
      meta: { title: L('Group Chat') },
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/group-settings',
      component: GroupSettings,
      name: 'GroupSettings',
      meta: { title: L('Group Settings') },
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/group-chat/:chatName',
      component: GroupChat,
      name: 'GroupChatConversation',
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/join',
      name: Join.name,
      component: Join,
      meta: { title: L('Join a Group') },
      // beforeEnter: createEnterGuards(loginGuard, mailGuard)
      beforeEnter: createEnterGuards(inviteGuard)
    },
    ...(process.env.NODE_ENV === 'development' ? [{
      path: '/error-testing',
      name: 'ErrorTesting',
      component: () => import('../views/pages/ErrorTesting.vue'),
      meta: { title: L('Error Testing') }
    }] : []),
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
