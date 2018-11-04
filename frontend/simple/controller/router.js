import Vue from 'vue'
import Router from 'vue-router'
import store from '../model/state.js'
import lazyLoadVue from './utils/lazyLoadVue.js'

import CreateGroup from '../views/CreateGroup.vue'
import {
  GroupName,
  GroupPurpose,
  GroupMincome,
  GroupRules,
  GroupPrivacy,
  GroupInvitees,
  GroupSummary
} from '../views/components/CreateGroupSteps'
import Contributions from '../views/Contributions.vue'
import DesignSystem from '../views/DesignSystem.vue'
import GroupDashboard from '../views/GroupDashboard.vue'
import GroupChat from '../views/GroupChat.vue'
import Home from '../views/Home.vue'
import Invite from '../views/Invite.vue'
import Join from '../views/Join.vue'
import Mailbox from '../views/Mailbox.vue'
import PayGroup from '../views/PayGroup.vue'
import Messages from '../views/Messages.vue'
import UserProfile from '../views/UserProfile.vue'
import Vote from '../views/Vote.vue'

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
  redirect: (to, from) => ({ path: '/new-group' })
}
var mailGuard = {
  guard: (to, from) => from.name !== Mailbox.name,
  redirect: (to, from) => ({ path: '/mailbox' })
}
function createEnterGuards (...guards) {
  return function (to, from, next) {
    for (let current of guards) {
      if (current.guard(to, from)) {
        return next(current.redirect(to, from))
      }
    }
    next()
  }
}
var router = new Router({
  mode: 'history',
  base: '/simple',
  scrollBehavior (to, from, savedPosition) {
    return { x: 0, y: 0 }
  },
  routes: [
    {
      path: '/',
      component: Home,
      name: 'home',
      meta: {
        title: 'Group Income' // page title. see issue #45
      },
      beforeEnter: createEnterGuards(homeGuard)
    },
    {
      path: '/design-system',
      component: DesignSystem,
      name: DesignSystem.name,
      meta: {
        title: 'Design System'
      }
      // beforeEnter: createEnterGuards(designGuard)
    },
    {
      path: '/new-group',
      component: CreateGroup,
      name: CreateGroup.name,
      meta: {
        title: 'Start A Group'
      },
      beforeEnter: createEnterGuards(loginGuard),
      children: [
        {
          path: 'name',
          name: GroupName.name,
          meta: {
            title: 'Start A Group - Name Your Group'
          },
          component: GroupName
        },
        {
          path: 'purpose',
          name: GroupPurpose.name,
          meta: {
            title: 'Start A Group - Group Purpose'
          },
          component: GroupPurpose
        },
        {
          path: 'income',
          name: GroupMincome.name,
          meta: {
            title: 'Start A Group - Minimum Income'
          },
          component: GroupMincome
        },
        {
          path: 'rules',
          name: GroupRules.name,
          meta: {
            title: 'Start A Group - Rules'
          },
          component: GroupRules
        },
        {
          path: 'privacy',
          name: GroupPrivacy.name,
          meta: {
            title: 'Start A Group - Privacy'
          },
          component: GroupPrivacy
        },
        {
          path: 'invitees',
          name: GroupInvitees.name,
          meta: {
            title: 'Start A Group - Invite Members'
          },
          component: GroupInvitees
        },
        {
          path: 'create',
          name: GroupSummary.name,
          meta: {
            title: 'Start A Group - Launch Group'
          },
          component: GroupSummary
        }
      ]
    },
    {
      path: '/dashboard',
      component: GroupDashboard,
      name: GroupDashboard.name,
      meta: {
        title: 'Group Dashboard'
      },
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/group-chat',
      component: GroupChat,
      name: GroupChat.name,
      meta: {
        title: 'Group Chat'
      },
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/user',
      component: UserProfile,
      meta: {
        title: 'User Profile'
      },
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/user-group',
      component: lazyLoadVue('UserGroupView'),
      meta: {
        title: 'Your Group'
      }
    },
    {
      path: '/contributions',
      component: Contributions,
      meta: {
        title: 'Contributions'
      },
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/pay-group',
      component: PayGroup,
      meta: {
        title: 'Pay Group'
      },
      beforeEnter: createEnterGuards(loginGuard)
    },
    /* Guards need to be created for any route that should not be directly accessed by url */
    {
      path: '/invite',
      name: Invite.name,
      component: Invite,
      meta: {
        title: 'Invite Group Members'
      },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    {
      path: '/mailbox',
      name: Mailbox.name,
      component: Mailbox,
      meta: {
        title: 'Mailbox'
      },
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/messages',
      name: 'Messages',
      component: Messages,
      meta: {
        title: 'Messages'
      }
      // beforeEnter: createEnterGuards(loginGuard) // NOTE UNDO THIS - to be able to test on iPhone
    },
    {
      path: '/messages/:name',
      name: 'MessagesConversation',
      component: Messages
      // beforeEnter: createEnterGuards(loginGuard) // NOTE UNDO THIS - to be able to test on iPhone
      // BUG/TODO "CANNOT GET /:username" when username has "." in it
      // ex: messages/joe.kim doesnt work but messages/joekim works fine.
      // Possible Solution: https://router.vuejs.org/guide/essentials/history-mode.html#example-server-configurations
    },
    {
      path: '/join',
      name: Join.name,
      component: Join,
      meta: {
        title: 'Join a Group'
      },
      beforeEnter: createEnterGuards(loginGuard, mailGuard)
    },
    {
      path: '/vote',
      name: Vote.name,
      component: Vote,
      meta: {
        title: 'Vote on a Proposal'
      },
      beforeEnter: createEnterGuards(loginGuard, mailGuard)
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
