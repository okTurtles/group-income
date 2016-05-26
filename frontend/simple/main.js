// uncomment once we decide to use bluebird
// var Promise = window.Promise = require('bluebird') // see comment in backend/index.js
// we can simply use jQuery instead of superagent
// var superagent = require('superagent') // fix superagent so that .end() returns a promise
// superagent.Request.prototype.end = Promise.promisify(superagent.Request.prototype.end)

import Vue from 'vue'
import Router from 'vue-router'
import SignUp from './views/SignUp.vue'
import UserProfileView from './views/UserProfileView.vue'
import NewIncomeView from './views/NewIncomeView.vue'
import PayGroupView from './views/PayGroupView.vue'
import NavBar from './views/NavBar.vue'
import { wrap, lazyLoadVue } from './js/utils'

Vue.config.debug = process.env.NODE_ENV === 'development'
Vue.use(Router)

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
