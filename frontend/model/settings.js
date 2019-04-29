export default {
  activeTab: 3,
  settings: [{
    legend: 'User settings',
    links: [
      {
        title: 'My account',
        url: 'my-account',
        index: 0
      }, {
        title: 'Privacy & Safety',
        url: 'privacy-safety',
        index: 1
      }
    ]
  }, {
    legend: 'App settings',
    links: [
      {
        title: 'Notifications',
        url: 'notifications',
        index: 2
      }, {
        title: 'Appearance',
        url: 'appearance',
        index: 3
      }
    ]
  }, {
    links: [
      {
        title: 'Changelog',
        url: 'changelog',
        index: 4
      },
      {
        title: 'Log Out',
        url: 'logout',
        action: 'logout'
      }
    ]
  }]
}
