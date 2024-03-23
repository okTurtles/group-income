'use strict'

import L from '../../common/translations.js'

export const GLOBAL_DASHBOARD_SETTINGS: {[string]: Object } = {
  'news-and-updates': {
    title: L('News & Updates'),
    routeTo: '/global-dashboard/news-and-updates',
    icon: 'newspaper'
  },
  'direct-messages': {
    title: L('Direct Messages'),
    routeTo: '/global-dashboard/direct-messages',
    icon: 'comment'
  }
}

export function handleFetchResult (type: string): ((r: any) => any) {
  return function (r: Object) {
    if (!r.ok) throw new Error(`${r.status}: ${r.statusText}`)
    return r[type]()
  }
}
