import Vue from 'vue'
import router from './js/router'
import './js/translations'
import * as db from './js/database'
import NavBar from './views/NavBar.vue'
import './js/transitions'
import {namespace} from './js/backend/hapi'
import store from './js/state'

async function loadLastUser () {
  let user = await db.loadCurrentUser()
  if (user) {
    let identityContractId = await namespace.lookup(user).catch((err) => {
      console.log('lookup failed!')
      store.dispatch('logout')
      if (err.status === 404) {
        console.warn(`It looks like the local user does not exist anymore on the server 😱 If this is unexpected, contact us at https://gitter.im/okTurtles/group-income`)
        db.clearUser(user)
      }
    })
    if (identityContractId) {
      await store.dispatch('login', {name: user, identityContractId})
    }
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
