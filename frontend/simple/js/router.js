import Vue from 'vue'
import Router from 'vue-router'
import VeeValidate from 'vee-validate'
import store from './state'
import SignUp from '../views/SignUp.vue'
import CreateGroup from '../views/CreateGroup.vue'
import GroupDashboard from '../views/GroupDashboard.vue'
import UserProfileView from '../views/UserProfileView.vue'
import Invite from '../views/Invite.vue'
import Mailbox from '../views/Mailbox.vue'
import Join from '../views/Join.vue'
import Vote from '../views/Vote.vue'
import PayGroup from '../views/PayGroup.vue'
import Home from '../views/Home.vue'
import ProposeMember from '../views/ProposeMember.vue'
import MembersCircle from '../components/MembersCircle.vue'
import {lazyLoadVue} from './utils'

Vue.use(Router)
Vue.use(VeeValidate)

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
  redirect: (to, from) => ({ path: '/signup', query: { next: to.path } })
}
var signupGuard = {
  guard: (to, from) => !!store.state.loggedIn,
  redirect: (to, from) => ({ path: '/' })
}
// Check if user has a group
var groupGuard = {
  guard: (to, from) => !store.state.currentGroupId,
  redirect: (to, from) => ({ path: '/new-group' })
}
var inviteGuard = {
  guard: (to, from) => store.getters.memberCount() >= 3,
  redirect: (to, from) => ({ path: '/propose-member' })
}
var proposeMemberGuard = {
  guard: (to, from) => store.getters.memberCount() < 3,
  redirect: (to, from) => ({ path: '/invite' })
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
        title: 'Group Income'  // page title. see issue #45
      },
      beforeEnter: createEnterGuards(homeGuard)
    },
    {
      path: '/signup',
      component: SignUp,
      name: SignUp.name, // route name. important!
      meta: {
        title: 'Sign Up'  // page title. see issue #45
      },
      beforeEnter: createEnterGuards(signupGuard)
    },
    {
      path: '/new-group',
      component: CreateGroup,
      name: CreateGroup.name,
      meta: {
        title: 'Create Group'
      },
      beforeEnter: createEnterGuards(loginGuard)
    },
    {
      path: '/dashboard',
      component: GroupDashboard,
      name: GroupDashboard.name,
      meta: {
        title: 'Group Dashboard'
      },
      beforeEnter: createEnterGuards(loginGuard, groupGuard)
    },
    {
      path: '/user',
      component: UserProfileView,
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
      path: '/pay-group',
      component: PayGroup,
      meta: {
        title: 'Pay Group'
      },
      beforeEnter: createEnterGuards(loginGuard, groupGuard, inviteGuard)
    },
    // NOTE: we no longer support ejs pages
    // {
    //   path: '/ejs-page',
    //   component: { template: wrap(require('../views/test.ejs')) },
    //   meta: {
    //     title: 'EJS Test Page'
    //   }
    // },
    /* Guards need to be created for any route that should not be directly accessed by url */
    {
      path: '/invite',
      name: Invite.name,
      component: Invite,
      meta: {
        title: 'Invite Group Members'
      },
      beforeEnter: createEnterGuards(loginGuard, groupGuard, inviteGuard)
    },
    {
      path: '/propose-member',
      name: ProposeMember.name,
      component: ProposeMember,
      meta: {
        title: 'Propose Group Members'
      },
      beforeEnter: createEnterGuards(loginGuard, groupGuard, proposeMemberGuard)
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
      // shouldn't be its own page but we have it here for testing
      path: '/members-circle',
      name: MembersCircle.name,
      component: MembersCircle,
      meta: {title: 'Members Circle'},
      beforeEnter: createEnterGuards(loginGuard)
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
