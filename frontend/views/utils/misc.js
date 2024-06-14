'use strict'
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
