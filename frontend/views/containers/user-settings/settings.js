'use strict'

import { L } from '@common/common.js'

export default {
  activeTab: 3,
  settings: [{
    legend: (L('User settings'): string),
    links: [
      {
        title: (L('My account'): string),
        url: 'my-account',
        component: 'UserProfile',
        index: 0
      }, {
        title: (L('Privacy & Safety'): string),
        url: 'privacy-safety',
        component: 'Placeholder',
        index: 1
      }
    ]
  }, {
    legend: (L('App settings'): string),
    links: [
      {
        title: (L('Notifications'): string),
        url: 'notifications',
        component: 'NotificationSettings',
        index: 2
      }, {
        title: (L('Appearance'): string),
        url: 'appearance',
        component: 'Appearence',
        index: 3
      }
    ]
  }, {
    legend: (L('Advanced'): string),
    links: [
      {
        title: (L('Application Logs'): string),
        url: 'application-logs',
        component: 'AppLogs',
        index: 4
      },
      {
        title: (L('Troubleshooting'): string),
        url: 'troubleshooting',
        component: 'Troubleshooting',
        index: 5
      }
    ]
  }, {
    links: [
      {
        title: (L('Log Out'): string),
        url: 'logout',
        action: 'gi.actions/identity/logout'
      }
    ]
  }]
}
