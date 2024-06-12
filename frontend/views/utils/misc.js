'use strict'
import sbp from '@sbp/sbp'
import VueRouter from 'vue-router'

export function logExceptNavigationDuplicated (err: Object) {
  err.name !== 'NavigationDuplicated' && console.error(err)
}

export function ignoreWhenNavigationCancelled (err: Object, path: string) {
  const { isNavigationFailure, NavigationFailureType } = VueRouter
  if (isNavigationFailure(err, NavigationFailureType.cancelled)) {
    console.log(`Navigation to ${path} cancelled, and another navigation took place instead`)
  } else {
    console.error(err)
  }
}

export const showNavMixin = {
  computed: {
    showNav (): boolean {
      // return this.$store.state.loggedIn && this.$store.getters.groupsByName.length > 0 && this.$route.path !== '/join'
      // we want to show the navbar on pending joining group so that we can logout or create a group ourself
      return this.$store.state.loggedIn && !['/join', '/'].includes(this.$route.path)
    }
  }
}

export const checkCypressMixin = {
  computed: {
    isInCypress (): boolean {
      // NOTE: By only checking the window.Cypress, it's difficult to say that the app is running in Cypress
      //       because anyone can access the window object.
      //       in Cypress mode, sbp is exposed to window object (see main.js) so window.sbp can be compared
      //       with our sbp object to verify if the app is in Cypress mode in real
      return !!window.Cypress && window.sbp === sbp
    }
  }
}
