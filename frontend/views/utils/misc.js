'use strict'

import Vue from 'vue'

export function vueFetchInitKV (obj, key, initialValue) {
  let value = obj[key]
  if (!value) {
    Vue.set(obj, key, initialValue)
    value = obj[key]
  }
  return value
}
