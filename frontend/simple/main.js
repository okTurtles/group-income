// uncomment once we decide to use bluebird
// var Promise = window.Promise = require('bluebird') // see comment in backend/index.js
// we can simply use jQuery instead of superagent
// var superagent = require('superagent') // fix superagent so that .end() returns a promise
// superagent.Request.prototype.end = Promise.promisify(superagent.Request.prototype.end)

import Vue from 'vue'
import Router from 'vue-router'
import UserProfileView from './views/UserProfileView.vue'
import UserGroupView from './views/UserGroupView.vue'
import NewIncomeView from './views/NewIncomeView.vue'
import PayGroupView from './views/PayGroupView.vue'
import { wrap } from './js/utils' // wrap string in a tag (<div> by default)

Vue.config.debug = process.env.NODE_ENV === 'development'
Vue.use(Router)
Vue.use(require('vue-script2'))
// Vue.use(require('./js/Script2'))

var router = new Router({
  hashbang: false,
  history: true,
  root: '/simple'
})

router.map({
  '/': { component: UserGroupView },
  '/new-user': {
    component: UserProfileView,
    title: 'Create User' // https://github.com/okTurtles/group-income-simple/issues/45
  },
  '/user': { component: UserProfileView },
  '/user/:username': { component: UserProfileView },
  '/user-group': { component: UserGroupView },
  '/new-income': { component: NewIncomeView },
  '/pay-group': { component: PayGroupView },
  '/ejs-page': {
    component: { template: wrap(require('./views/test.ejs')) },
    title: 'EJS Test Page'
  }
})

router.beforeEach(function () {
  window.scrollTo(0, 0)
})

router.redirect({
  '*': '/' // TODO: make this a 404
})

var App = Vue.extend({})
router.start(App, 'html') // bind to html so we can change the title and head section
