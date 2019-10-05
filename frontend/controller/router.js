import Vue from 'vue'
import Router from 'vue-router'
import store from '@model/state.js'
import DesignSystem from '@pages/DesignSystem.vue'
import Home from '@pages/Home.vue'
import Messages from '@pages/Messages.vue'
import GroupDashboard from '@pages/GroupDashboard.vue'
import Contributions from '@pages/Contributions.vue'
import PayGroup from '@pages/PayGroup.vue'
import GroupChat from '@pages/GroupChat.vue'
import Invite from '@pages/Invite.vue'
import Join from '@pages/Join.vue'
import Mailbox from '@pages/Mailbox.vue'
import Vote from '@pages/Vote.vue'
import GroupSettings from '@pages/GroupSettings.vue'
import L from '@view-utils/translations.js'

Vue.use(Router)

/*
 The following are reusable guard for routes
 the 'guard' defines how the route is blocked and the redirect determines the redirect behavior
 when a route is blocked
 */
var homeGuard = {
  guard: (to, from) => !!store.state.currentGroupId,
  redirect: (to, from) => ({ path: '/dashboard' })
}
var loginGuard = {
  guard: (to, from) => !store.state.loggedIn,
  redirect: (to, from) => ({ path: '/', query: { next: to.path } })
}
// Check if user has a group
var groupGuard = {
  guard: (to, from) => !store.state.currentGroupId,
  redirect: (to, from) => ({ path: '?modal=new-group' })
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
var router = new Router({
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
      path: '/dashboard',
      component: GroupDashboard,
      name: GroupDashboard.name,
      meta: { title: L('Group Dashboard') },
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/contributions',
      component: Contributions,
      meta: { title: L('Contributions') },
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/pay-group',
      component: PayGroup,
      meta: { title: L('Pay Group') },
      beforeEnter: createEnterGuards(loginGuard)
    },
    /* Guards need to be created for any route that should not be directly accessed by url */
    {
      path: '/invite',
      name: Invite.name,
      component: Invite,
      meta: { title: L('Invite Group Members') },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
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
      meta: { title: L('Group Seettings') },
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
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/vote',
      name: Vote.name,
      component: Vote,
      meta: { title: L('Vote on a Proposal') },
      beforeEnter: createEnterGuards(loginGuard)
    },
    process.env.NODE_ENV === 'development' ? {
      path: '/error-testing',
      name: 'ErrorTesting',
      component: () => import('../views/pages/ErrorTesting.vue'),
      meta: { title: L('Error Testing') }
    } : {},
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
