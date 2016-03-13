import Vue from 'vue'
import Router from 'vue-router'
// import { domain, fromNow } from './filters'
import App from './components/App.vue'
import UserProfileView from './components/UserProfileView.vue'
import UserGroupView from './components/UserGroupView.vue'
import NewIncomeView from './components/NewIncomeView.vue'
import PayGroupView from './components/PayGroupView.vue'

// install router
Vue.use(Router)

// register filters globally
// Vue.filter('fromNow', fromNow)
// Vue.filter('domain', domain)

// routing
var router = new Router({
  hashbang: false,
  history: true,
  root: '/simple'
})

router.map({
  '/user-profile': {
    name: 'user-profile',
    component: UserProfileView
  },
  '/user-group': {
    name: 'user-group',
    component: UserGroupView
  },
  '/new-income': {
    name: 'new-income',
    component: NewIncomeView
  },
  '/pay-group': {
    name: 'pay-group',
    component: PayGroupView
  }
})

router.beforeEach(function () {
  window.scrollTo(0, 0)
})

router.redirect({
  '*': '/user-profile'
})

router.start(App, '#app')

// alt from https://github.com/vuejs/vuex/blob/master/examples/todomvc/main.js
/*
import Vue from 'vue'
import store from './vuex/store'
import App from './components/App.vue'

new Vue({
  store, // inject store to all children
  el: 'body',
  components: { App }
})
*/
