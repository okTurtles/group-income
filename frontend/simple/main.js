import Vue from 'vue'
import Router from 'vue-router'
import SignUp from './views/SignUp.vue'
import UserProfileView from './views/UserProfileView.vue'
import NewIncomeView from './views/NewIncomeView.vue'
import PayGroupView from './views/PayGroupView.vue'
import NavBar from './views/NavBar.vue'
import utils, { wrap, lazyLoadVue, superagentHeader } from './js/utils'

Vue.config.debug = process.env.NODE_ENV === 'development'
Vue.use(Router)
Vue.use(require('vue-form'), {invalidClass: 'is-danger'})

superagentHeader('Authorization', `gi ${utils.sign('hello', utils.keypair)}`)

var router = new Router({
  hashbang: false,
  history: true,
  root: '/simple'
})

router.map({
  '/': { component: SignUp },
  '/new-user': {
    title: 'Sign Up', // page title. see issue #45
    component: SignUp
  },
  '/user': { component: UserProfileView },
  '/user/:username': { component: UserProfileView },
  '/user-group': {
    title: 'Your Group',
    component: lazyLoadVue('UserGroupView')
  },
  '/new-income': { component: NewIncomeView },
  '/pay-group': { component: PayGroupView },
  '/ejs-page': {
    title: 'EJS Test Page',
    component: { template: wrap(require('./views/test.ejs')) }
  }
})

router.beforeEach(function () {
  window.scrollTo(0, 0)
})

router.redirect({
  '*': '/' // TODO: make this a 404
})

var App = Vue.extend({components: {NavBar}})
router.start(App, 'html') // bind to html so we can change the title and head section
