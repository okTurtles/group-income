import sbp from '../../shared/sbp'
import '../../shared/domains/okTurtles/events'
import '../../shared/domains/okTurtles/data'
import '../../shared/domains/groupIncome/contracts'
// import SBP stuff before anything else so that domains register themselves before called
import Vue from 'vue'
import router from './controller/router'
import './js/translations'
import * as db from './model/database'
import NavBar from './views/NavBar.vue'
import './js/transitions'
import {namespace} from './controller/backend/hapi'
import store from './model/state'

console.log('NODE_ENV:', process.env.NODE_ENV)

// NOTE: we setup this global SBP filter and domain regs here
//       to get logging for all subsequent SBP calls.
//       In the future we might move it elsewhere.
if (process.env.NODE_ENV !== 'production') {
  sbp('sbp/filters/global/add', (domain, selector, data) => {
    console.log(`[sbp] CALL: ${selector}:`, data)
  })
}

async function loadLastUser () {
  let user = await db.loadCurrentUser()
  if (user) {
    try {
      let identityContractId = await namespace.lookup(user)
      await store.dispatch('login', {name: user, identityContractId})
    } catch (err) {
      console.log('lookup failed!')
      store.dispatch('logout')
      if (err.status === 404) {
        console.warn(`It looks like the local user does not exist anymore on the server 😱 If this is unexpected, contact us at https://gitter.im/okTurtles/group-income`)
        db.clearUser(user)
      }
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
