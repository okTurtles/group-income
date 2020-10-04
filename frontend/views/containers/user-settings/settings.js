'use strict'

import L from '@view-utils/translations.js'

export default {
  activeTab: 3,
  settings: [{
    legend: L('User settings'),
    links: [
      {
        title: L('My account'),
        url: 'my-account',
        component: 'UserProfile',
        index: 0
      }, {
        title: L('Privacy & Safety'),
        url: 'privacy-safety',
        component: 'Placeholder',
        index: 1
      }
    ]
  }, {
    legend: L('App settings'),
    links: [
      {
        title: L('Notifications'),
        url: 'notifications',
        component: 'Placeholder',
        index: 2
      }, {
        title: L('Appearance'),
        url: 'appearance',
        component: 'Appearence',
        index: 3
      }
    ]
  }, {
    links: [
      {
        title: L('Application Logs'),
        url: 'application-logs',
        component: 'AppLogs',
        index: 4
      },
      {
        title: L('Troubleshooting'),
        url: 'troubleshooting',
        component: 'Troubleshooting',
        index: 5
      }
    ]
  }, {
    links: [
      {
        title: L('Log Out'),
        url: 'logout',
        action: 'logout'
      }
    ]
  }]
}
