const { defineConfig } = require('cypress')

module.exports = defineConfig({
  viewportWidth: 1201,
  viewportHeight: 900,
  defaultCommandTimeout: 45000,
  fixturesFolder: 'test/cypress/fixtures',
  screenshotsFolder: 'test/cypress/screenshots',
  videosFolder: 'test/cypress/videos',
  video: true,
  trashAssetsBeforeRuns: true,
  projectId: 'q6whky',
  experimentalMemoryManagement: true,
  // NOTE: When running 'cypress open' on a browser, high memory usage often leads to crashing the browser.
  //       So setting 'numTestsKeptInMemory' to 0 here. (reference: https://docs.cypress.io/guides/references/configuration#Global)
  numTestsKeptInMemory: 0,
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents (on, config) {
      return require('./test/cypress/plugins')(on, config)
    },
    baseUrl: 'http://localhost:8000',
    specPattern: 'test/cypress/integration/**/*.{js,jsx,ts,tsx}',
    supportFile: 'test/cypress/support/index.js',
    testIsolation: false,
    experimentalRunAllSpecs: true // reference: https://www.cypress.io/blog/check-out-our-experimental-release-of-run-all-specs
  }
})
