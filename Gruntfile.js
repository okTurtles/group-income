// See: https://github.com/okTurtles/group-income-simple/issues/23

// make sure to read:
// http://jamesknelson.com/the-six-things-you-need-to-know-about-babel-6/
// TODO: figure out whether `babel-runtime` should be installed using --save
//       instead of --save-dev per: https://babeljs.io/docs/plugins/transform-runtime/
//       and figure out whether we should switch to using version 6:
//       https://github.com/vuejs/vue-loader/issues/96#issuecomment-162910917

require('babel-register') // http://stackoverflow.com/a/34195553/1781435
                          // https://babeljs.io/docs/setup/#babel_register
                          // TODO: No longer needed in Node 6: https://gist.github.com/rauchg/8199de60db48026a6670620a1c33b700

// transform-inline-environment-variables should will replace
// process.env.VARIABLE strings like C macros (with their values)
// And because of additional lines in .Gruntfile.babel.js this is done on both
// the backend and the frontend.
var _ = require('lodash')

var PORTS = {
  FRONTEND: 8000,
  BACKEND: 3000
}
_.assign(process.env, {
  NODE_ENV: _.intersection(process.argv, ['dist', 'deploy'])[0] ? 'production' : 'development',
  API_PORT: PORTS.BACKEND,
  FRONTEND_PORT: PORTS.FRONTEND,
  API_URL: 'http://localhost:' + PORTS.BACKEND,
  FRONTEND_URL: 'http://localhost:' + PORTS.FRONTEND
})
module.exports = require('./.Gruntfile.babel.js')
