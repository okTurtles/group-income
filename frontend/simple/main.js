import Vue from 'vue'
import Router from 'vue-router'
import './js/translations'
import * as db from './js/database'
import NavBar from './views/NavBar.vue'
import VeeValidate from 'vee-validate'
import store from './js/state'
import './js/transitions'
import router from './js/router'

Vue.use(Router)
Vue.use(VeeValidate)

Vue.events = new Vue() // global event bus, use: https://vuejs.org/v2/api/#Instance-Methods-Events

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
