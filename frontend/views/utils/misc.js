'use strict'

// this file is loaded by common.js, so we import Vue directly
import Vue from 'vue'

export function vueFetchInitKV (obj: Object, key: string, initialValue: any): any {
  let value = obj[key]
  if (!value) {
    Vue.set(obj, key, initialValue)
    value = obj[key]
  }
  return value
}

export function logExceptNavigationDuplicated (err: Object) {
  err.name !== 'NavigationDuplicated' && console.error(err)
}
