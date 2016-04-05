var Promise = global.Promise = require('bluebird') // see comment in backend/index.js
var superagent = require('superagent') // fix superagent so that .end() returns a promise
superagent.Request.prototype.end = Promise.promisify(superagent.Request.prototype.end)

import Vue from 'vue'
import Router from 'vue-router'
import UserProfileView from './views/UserProfileView.vue'
import UserGroupView from './views/UserGroupView.vue'
import NewIncomeView from './views/NewIncomeView.vue'
import PayGroupView from './views/PayGroupView.vue'
import Include from './js/Include'
import { wrap } from './js/utils'

Vue.config.debug = process.env.NODE_ENV === 'development'
Vue.use(Router)
Vue.use(Include)

var router = new Router({
  hashbang: false,
  history: true,
  root: '/simple'
})

router.map({
  '/': { component: { template: wrap(require('./views/test.ejs')()) } },
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
    component: { template: wrap(require('./views/test.ejs')()) },
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
