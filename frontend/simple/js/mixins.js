'use strict'

import {actions} from './state'

const {login, logout} = actions

export const loginLogout = {
  vuex: {
    getters: {
      loggedIn: state => state.loggedIn
    },
    actions: {login, logout}
  }
}
