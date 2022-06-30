const { defineConfig } = require('cypress')

module.exports = defineConfig({
  viewportWidth: 1201,
  viewportHeight: 900,
  defaultCommandTimeout: 10000,
  fixturesFolder: 'test/cypress/fixtures',
  screenshotsFolder: 'test/cypress/screenshots',
  videosFolder: 'test/cypress/videos',
  video: true,
  videoUploadOnPasses: false,
  trashAssetsBeforeRuns: true,
  projectId: 'q6whky',
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require('./test/cypress/plugins')(on, config)
    },
    baseUrl: 'http://localhost:8000',
    specPattern: 'test/cypress/integration/**/*.{js,jsx,ts,tsx}',
    supportFile: 'test/cypress/support/index.js',
  },
})
