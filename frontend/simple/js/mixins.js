'use strict'

import {actions} from './state'

const {login, logout} = actions

export const loginLogout = {
  vuex: {
    getters: {
      loggedIn: (state: Object) => state.loggedIn
    },
    actions: {login, logout}
  }
}
