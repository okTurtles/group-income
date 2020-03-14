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
        index: 0
      }, {
        title: L('Privacy & Safety'),
        url: 'privacy-safety',
        index: 1
      }
    ]
  }, {
    legend: L('App settings'),
    links: [
      {
        title: L('Notifications'),
        url: 'notifications',
        index: 2
      }, {
        title: L('Appearance'),
        url: 'appearance',
        index: 3
      }
    ]
  }, {
    links: [
      {
        title: L('Application Logs'),
        url: 'application-logs',
        index: 4
      },
      {
        title: L('Troubleshooting'),
        url: 'troubleshooting',
        index: 5
      },
      {
        title: L('Log Out'),
        url: 'logout',
        action: 'logout'
      }
    ]
  }]
}
