import Vue from 'vue'
import Router from 'vue-router'
import './js/translations'
import * as db from './js/database'
import VeeValidate from 'vee-validate'
import SignUp from './views/SignUp.vue'
import CreateGroup from './views/CreateGroup.vue'
import UserProfileView from './views/UserProfileView.vue'
import TestEventLog from './views/EventLog.vue'
import Invite from './views/Invite.vue'
import Mailbox from './views/Mailbox.vue'
// import NewIncomeView from './views/NewIncomeView.vue'
import PayGroupView from './views/PayGroupView.vue'
import NavBar from './views/NavBar.vue'
import { wrap, lazyLoadVue } from './js/utils'
import store from './js/state'
import './js/transitions'

Vue.use(Router)
Vue.use(VeeValidate)

Vue.events = new Vue() // global event bus, use: https://vuejs.org/v2/api/#Instance-Methods-Events
/*
  The following are reusable guard for routes
  the 'guard' defines how the route is blocked and the redirect determines the redirect behavior
  when a route is blocked
 */
// Check if user is logged in
var loginGuard = {
  guard (store) {
    return !store.state.loggedIn
  },
  redirect (to, from) {
    return { path: '/signup', query: { next: to.path } }
  }
}
// Check if user has a group to invite users to
var inviteGuard = {
  guard (store) {
    return !store.state.currentGroupId
  },
  redirect (to, from) {
    return { path: '/new-group' }
  }
}
function createEnterGuards (store, ...guards) {
  return function (to, from, next) {
    for (let i = 0; i < guards.length; i++) {
      let current = guards[i]
      if (current.guard(store)) {
        return next(current.redirect(to, from))
      } else {
        continue
      }
    }
    return next()
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
      component: SignUp,
      meta: {
        title: 'Sign Up'  // page title. see issue #45
      }
    },
    {
      path: '/signup',
      component: SignUp,
      name: SignUp.name, // route name. important!
      meta: {
        title: 'Sign Up'  // page title. see issue #45
      }
    },
    {
      path: '/new-group',
      component: CreateGroup,
      name: CreateGroup.name,
      meta: {
        title: 'Create Group'
      },
      beforeEnter: createEnterGuards(store, loginGuard)
    },
    {
      path: '/user',
      component: UserProfileView,
      meta: {
        title: 'User Profile'
      }
    },
    {
      path: '/user/:username',
      component: UserProfileView,
      meta: {
        title: 'User Profile'
      }
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
      component: PayGroupView,
      meta: {
        title: 'Pay Group'
      }
    },
    {
      path: '/ejs-page',
      component: { template: wrap(require('./views/test.ejs')) },
      meta: {
        title: 'EJS Test Page'
      }
    },
    {
      path: '/event-log',
      component: TestEventLog,
      meta: {
        title: 'Event Log Test Page'
      }
    },
    /* Guards need to be created for any route that should not be directly accessed by url */
    {
      path: '/invite',
      name: Invite.name,
      component: Invite,
      meta: {
        title: 'Invite Group Members'
      },
      beforeEnter: createEnterGuards(store, loginGuard, inviteGuard)
    },
    {
      path: '/mailbox',
      name: Mailbox.name,
      component: Mailbox,
      meta: {
        title: 'Mailbox'
      },
      beforeEnter: createEnterGuards(store, loginGuard)
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
async function loadLastUser () {
  let user = await db.loadCurrentUser()
  if (user) {
    await store.dispatch('login', user)
  }
  /* eslint-disable no-new */
  new Vue({
    router: router,
    components: {NavBar},
    store // make this and all child components aware of the new store
  }).$mount('#app')
}
loadLastUser()
