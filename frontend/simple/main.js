import Vue from 'vue'
import Router from 'vue-router'
import './js/translations'
import * as db from './js/database'
import NavBar from './views/NavBar.vue'
import VeeValidate from 'vee-validate'
import './js/transitions'
import router from './js/router'
import {namespace} from './js/backend/hapi'
import store from './js/state'

Vue.use(Router)
Vue.use(VeeValidate)

async function loadLastUser () {
  let user = await db.loadCurrentUser()
  if (user) {
    let identityContractId = await namespace.lookup(user)
    await store.dispatch('login', {name: user, identityContractId})
  }
  /* eslint-disable no-new */
  new Vue({
    router: router,
    components: {NavBar},
    store // make this and all child components aware of the new store
  }).$mount('#app')
  Vue.events.$on('logout', () => router.push({path: '/'}))
}
loadLastUser()
