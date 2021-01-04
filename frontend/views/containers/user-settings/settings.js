'use strict'

import L from '@view-utils/translations.js'

export default {
  activeTab: 3,
  settings: [{
    legend: (L('User settings'): any),
    links: [
      {
        title: (L('My account'): any),
        url: 'my-account',
        component: 'UserProfile',
        index: 0
      }, {
        title: (L('Privacy & Safety'): any),
        url: 'privacy-safety',
        component: 'Placeholder',
        index: 1
      }
    ]
  }, {
    legend: (L('App settings'): any),
    links: [
      {
        title: (L('Notifications'): any),
        url: 'notifications',
        component: 'Placeholder',
        index: 2
      }, {
        title: (L('Appearance'): any),
        url: 'appearance',
        component: 'Appearence',
        index: 3
      }
    ]
  }, {
    links: [
      {
        title: (L('Application Logs'): any),
        url: 'application-logs',
        component: 'AppLogs',
        index: 4
      },
      {
        title: (L('Troubleshooting'): any),
        url: 'troubleshooting',
        component: 'Troubleshooting',
        index: 5
      }
    ]
  }, {
    links: [
      {
        title: (L('Log Out'): any),
        url: 'logout',
        action: 'logout'
      }
    ]
  }]
}
