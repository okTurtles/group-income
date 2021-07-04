// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

// const browserify = require('@cypress/browserify-preprocessor')

// module.exports = (on) => {
//   // Make cypress share the same babelrc config as the rest of the project
//   // https://github.com/cypress-io/cypress-browserify-preprocessor#modifying-default-options
//   const options = browserify.defaultOptions
//   options.browserifyOptions.transform[1][1].babelrc = true

//   on('file:preprocessor', browserify(options))
// }

// From https://docs.cypress.io/api/plugins/browser-launch-api#Set-screen-size-when-running-headless
module.exports = (on, config) => {
  on('before:browser:launch', (browser, launchOptions) => {
    if (browser.name === 'chrome' && browser.isHeadless) {
      launchOptions.args.push('--window-size=1280,720')

      // force screen to be non-retina
      launchOptions.args.push('--force-device-scale-factor=1')
    }

    if (browser.name === 'electron' && browser.isHeadless) {
      launchOptions.preferences.width = 1280
      launchOptions.preferences.height = 720
    }

    if (browser.name === 'firefox' && browser.isHeadless) {
      // menubars take up height on the screen
      // so fullPage screenshot size is a bit higher
      launchOptions.args.push('--width=720')
      launchOptions.args.push('--height=1280')
    }

    return launchOptions
  })
}
