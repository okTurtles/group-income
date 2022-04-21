'use strict'

import sbp from '@sbp/spb'

// NOTE: this file is currently unused. I messed around with it just enough
// to get it working at the most primitive level and decide that I need to
// move on before returning to it. Once it's ready to be added to the app,
// we'll import this file in main.js and call the setup selector there.

sbp('sbp/selectors/register', {
  'service-workers/setup': async function () {
    // setup service worker
    // TODO: move ahead with encryption stuff ignoring this service worker stuff for now
    // TODO: improve updating the sw: https://stackoverflow.com/a/49748437
    // NOTE: user should still be able to use app even if all the SW stuff fails
    try {
      await navigator.serviceWorker.register('/assets/js/sw-primary.js', {
        scope: '/'
      })
      navigator.serviceWorker.addEventListener('message', function (event) {
        console.info('Received message from SW:', event.data)
      })
      setTimeout(function () {
        navigator.serviceWorker.controller.postMessage({
          type: 'set',
          key: 'foo',
          value: 'bar'
        })
      }, 1000)
    } catch (e) {
      // TODO: this
      console.error('error setting up service worker:', e)
    }
  }
})
