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

export function validateURL (url: string, acceptPathOnly: boolean = false): Object {
  const response: any = {
    isValid: false,
    isHttpValid: false,
    isMailtoValid: false,
    url: null
  }

  if (acceptPathOnly) {
    const regExpMap = {
      pathOnly: /^\/[^\s]*$/, // eg. /app/chatroom/chatID, /to-a-path,
      slugPiece: /^[a-zA-Z0-9_-]+$/, // eg. contributions, payments, dashboard, abc_123
      slugPieceWithLeadingSharp: /^#[a-zA-Z0-9_-]+$/ // eg. #hello, #user_123, #valid-ID
    }

    if (regExpMap.pathOnly.test(url) && url.startsWith('/app')) {
      // Case 1. if the url is a path starts with '/app', take it as a route to an in-app page.
      const path = url.split('/app')[1]
      url = location.origin + '/app' + path
    } else if (regExpMap.slugPiece.test(url)) {
      // Case 2. if the passed url is a string that does not contain any URL-related special characters(/, #, etc.), assume it is a route to an in-app page too.
      url = location.origin + `/app/${url}`
    } else if (regExpMap.pathOnly.test(url) || regExpMap.slugPieceWithLeadingSharp.test(url)) {
      // Case 3. Rest of the valid cases:
      // 1. a path-only string that is not an in-app route eg. /to-a-path
      // 2. anchor-link eg. #hello, #user_123, #valid-ID
      response.isValid = true
      response.url = url

      return response
    }
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
