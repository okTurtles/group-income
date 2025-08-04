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

export function validateURL (url: string): Object {
  const pathOnlyRegExp = /^\/[^\s]*$/

  const response: any = {
    isValid: false,
    isHttpValid: false,
    isMailtoValid: false,
    url: null
  }

  if (pathOnlyRegExp.test(url)) {
    // If the passed URL is a path only string such as '/app/chatroom/chatID', we consider it as a valid URL.
    response.isValid = true
    response.isHttpValid = true
    response.url = url
    return response
  }

  try {
    const objURL = new URL(url)
    response.isValid = true
    response.isHttpValid = objURL.protocol === 'http:' || objURL.protocol === 'https:'
    response.isMailtoValid = objURL.protocol === 'mailto:'
    response.url = objURL
  } catch (err) {
    response.isValid = false
  }

  return response
}
