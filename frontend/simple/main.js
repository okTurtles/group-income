import Vue from 'vue'
import Router from 'vue-router'
import './js/translations'
import VeeValidate from 'vee-validate'
import SignUp from './views/SignUp.vue'
import CreateGroup from './views/CreateGroup.vue'
import UserProfileView from './views/UserProfileView.vue'
import TestEventLog from './views/EventLog.vue'
import Invite from './views/Invite.vue'
// import NewIncomeView from './views/NewIncomeView.vue'
import PayGroupView from './views/PayGroupView.vue'
import NavBar from './views/NavBar.vue'
import { wrap, lazyLoadVue } from './js/utils'
import store from './js/state'
import './js/transitions'

Vue.use(Router)
Vue.use(VeeValidate)

Vue.events = new Vue() // global event bus, use: https://vuejs.org/v2/api/#Instance-Methods-Events

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
      beforeEnter (to, from, next) {
        if (!store.state.loggedIn) {
          console.log(to.name, `redirecting to ${SignUp.name}!`)
          next({ path: '/signup', query: { next: to.path } })
        } else {
          next()
        }
      }
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
      beforeEnter (to, from, next) {
        if (!store.state.loggedIn) {
          console.log(to.name, `redirecting to ${SignUp.name}!`)
          next({ path: '/signup', query: { next: '/new-group' } })
        } else if (!store.state.currentGroupId) {
          console.log(to.name, `redirecting to ${CreateGroup.name}!`)
          next({ path: '/new-group' })
        } else {
          next()
        }
      }
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
/* global sessionStorage */
let user = sessionStorage.getItem('loggedIn')
if (user) {
  store.dispatch('login', user)
}
/* eslint-disable no-new */
new Vue({
  router: router,
  components: {NavBar},
  store // make this and all child components aware of the new store
}).$mount('#app')
