import Vue from 'vue'
import Router from 'vue-router'

import SignUp from './views/SignUp.vue'
import CreateGroup from './views/CreateGroup.vue'
import UserProfileView from './views/UserProfileView.vue'
// import NewIncomeView from './views/NewIncomeView.vue'
import PayGroupView from './views/PayGroupView.vue'
import NavBar from './views/NavBar.vue'
import utils, { wrap, lazyLoadVue, superagentHeader } from './js/utils'
import store from './js/state'
import './js/transitions'

Vue.use(Router)
Vue.use(require('vue-form'), { invalidClass: 'is-danger' })

superagentHeader('Authorization', `gi ${utils.sign('hello', utils.keypair)}`)

var router = new Router({
  mode: 'history',
  base: '/simple',
  routes: [
    {
      path: '/',
      component: SignUp
    },
    {
      path: '/signup',
      component: SignUp,
      meta: {
        title: 'Sign Up',  // page title. see issue #45
        name: SignUp.name // route name. important!
      }
    },
    {
      path: '/new-group',
      component: CreateGroup,
      meta: {
        title: 'Create Group',
        name: CreateGroup.name
      }
    },
    {
      path: '/user',
      component: UserProfileView
    },
    {
      path: '/user/:username',
      component: UserProfileView
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
      component: PayGroupView
    },
    {
      path: '/ejs-page',
      component: { template: wrap(require('./views/test.ejs')) },
      meta: {
        title: 'EJS Test Page'
      }
    }
  ]
})

router.beforeEach(function () {
  window.scrollTo(0, 0)
})
/* eslint-disable no-new */
new Vue({
  router: router,
  components: {NavBar},
  render: h => h('router-view'),
  store // make this and all child components aware of the new store
}).$mount('#app')

