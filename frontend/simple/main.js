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
  '/signup': {
    title: 'Sign Up',  // page title. see issue #45
    name: SignUp.name, // route name. important!
    component: SignUp
  },
  '/new-group': {
    title: 'Create Group',
    name: CreateGroup.name,
    component: CreateGroup
  },
  '/user': { component: UserProfileView },
  '/user/:username': { component: UserProfileView },
  '/user-group': {
    title: 'Your Group',
    component: lazyLoadVue('UserGroupView')
  },
  // '/new-income': { component: NewIncomeView },
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

var App = Vue.extend({
  components: {NavBar},
  store // make this and all child components aware of the new store
})
router.start(App, 'html') // bind to html so we can change the title and head section
