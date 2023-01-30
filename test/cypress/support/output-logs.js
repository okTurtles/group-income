// ***********
// Output App logs in case a test fails!
// Copied directly from: https://github.com/cypress-io/cypress/issues/3199#issuecomment-466593084
// ***********

// eslint-disable-next-line @typescript-eslint/no-var-requires
const APPLICATION_NAME = require('../../../package.json').name

let logs = ''

Cypress.on('window:before:load', (window) => {
  // Only output app logs when running headless.
  if (!Cypress.browser.isHeadless) {
    return
  }
  // Get your apps iframe by id.
  const docIframe = window.parent.document.getElementById(`Your App: '${APPLICATION_NAME}'`)

  if (!docIframe) {
    throw new Error('Cannot find app iframe: `docIframe` is null. Make sure the given app name is correct.')
  }
  // Get the window object inside of the iframe.
  const appWindow = docIframe.contentWindow;

  // This is where I overwrite all of the console methods.
  ['log', 'info', 'error', 'warn', 'debug'].forEach((consoleProperty) => {
    appWindow.console[consoleProperty] = function (...args) {
      /*
         * The args parameter will be all of the values passed as arguments to
         * the console method. ( If your not using es6 then you can use `arguments`)
         * Example:
         *       If your app uses does `console.log('argument1', 'arument2');`
         *       Then args will be `[ 'argument1', 'arument2' ]`
         */
      // Save everything passed into a variable or any other solution
      // you make to keep track of the logs
      // Use JSON.stringify to avoid [object, object] in the output
      // logs += JSON.stringify(args.join(' ')) + '\n'
      try {
        logs += JSON.stringify([consoleProperty, ...args]) + ',\n'
      } catch (e) {
        // sometimes stringify will fail because of a circular reference
        const argsCopy = []
        for (const arg of args) {
          try {
            argsCopy.push(JSON.stringify(arg))
          } catch (e) {
            argsCopy.push('[circular reference]')
          }
        }
        logs += JSON.stringify([
          'ERROR(CYPRESS)',
          `couldn't stringify ${consoleProperty} message in app test due to ${e.name}: '${e.message}'`,
          'original message (with cycle removed):',
          ...argsCopy
        ]) + ',\n'
      }
    }
  })
})

// Cypress doesn't have a each test event
// so I'm using mochas events to clear log state after every test.
Cypress.mocha.getRunner().on('test', () => {
  // Every test reset your logs to be empty
  // This will make sure only logs from that test suite will be logged if a error happens
  logs = ''
})

// On a cypress fail. I add the console logs, from the start of test or after the last test fail to the
// current fail, to the end of the error.stack property.
Cypress.on('fail', (error) => {
  error.stack += '\nConsole Logs:\n========================\n'
  error.stack += '[' + logs + ' null]'
  // clear logs after fail so we dont see duplicate logs
  logs = ''
  // still need to throw the error so tests wont be marked as a pass
  throw error
})
