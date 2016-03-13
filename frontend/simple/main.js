import Vue from 'vue'
import Router from 'vue-router'
// import { domain, fromNow } from './filters'
import App from './components/App.vue'
import Hello from './components/Hello.vue'
// import ItemView from './components/ItemView.vue'
// import UserView from './components/UserView.vue'

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
  '/hello/:page': {
    component: Hello
  }
})

router.beforeEach(function () {
  window.scrollTo(0, 0)
})

router.redirect({
  '*': '/hello/1'
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
