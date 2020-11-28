'use strict'

// =======================
// Entry point.
//
// Ensures:
//
// - Babel functions on the backend, in mocha tests, etc.
// - Environment variables are set to different values depending
//   on whether we're in a production environment or otherwise.
//
// TODO: Once node and web browsers fully support babel's features
//       we can get rid of this file.
//       https://github.com/okTurtles/group-income-simple/issues/73
// =======================

// https://babeljs.io/docs/setup/#babel_register
// https://babeljs.io/docs/en/next/babel-register
require('@babel/register')({
  // if we do not set cache: false, then the ports on process.env.(API_URL, etc)
  // won't get updated correctly. There's a hack that seems to work, which is to
  // simply console.log those values in backend/server.js and elsewhere,
  // which seems to "clear the cache" somehow, but this seems cleaner and
  // safer.
  // The other alternative is to not use the `transform-inline-environment-variables`
  // plugin. However, that plugin is definitely needed for the frontend, which
  // doesn't get run in node.js (and therefore must have process.env.* transformed).
  cache: false
})

// =======================
// Global environment variables setup
//
// `transform-inline-environment-variables` (set in .babelrc), will
// cause process.env.VARIABLE to be replaced with their corresponding
// values, similar to C macros.
// =======================

var PORTS = {
  FRONTEND: 8000 + parseInt(process.env.PORT_SHIFT || 0),
  // BACKEND: 3000 + parseInt(process.env.PORT_SHIFT || 0)
  BACKEND: 8000 + parseInt(process.env.PORT_SHIFT || 0)
}
Object.assign(process.env, {
  NODE_ENV: process.env.NODE_ENV || (process.argv.some(x => /\b(dist|deploy)\b/.test(x)) ? 'production' : 'development'),
  API_PORT: PORTS.BACKEND,
  FRONTEND_PORT: PORTS.FRONTEND,
  // TODO: make the protocol (http vs https) variable based on environment var
  API_URL: 'http://localhost:' + PORTS.BACKEND,
  FRONTEND_URL: 'http://localhost:' + PORTS.FRONTEND
})

// =======================
// Trampoline to enable babel in various places
// (the backend, mocha tests, .Gruntfile.babel.js)
// =======================

// Now 'require' is primed to parse files through babel.
if (!process.env.LOAD_NO_FILE) {
  const target = process.env.LOAD_TARGET_FILE || './.Gruntfile.babel.js'
  console.log('Gruntfile.js: loading file with babel support:', target)
  module.exports = require(target)
} else {
  console.log('Gruntfile.js: just calling babel-register, not loading any file.')
}

// =======================
// Old comments, that used to exist at the top of this file,
// are saved here for "safe keeping". These might be outdated
// and certainly will be removed at somepoint.
// =======================

// make sure to read:
// http://jamesknelson.com/the-six-things-you-need-to-know-about-babel-6/
// TODO: figure out whether `babel-runtime` should be installed using --save
//       instead of --save-dev per: https://babeljs.io/docs/plugins/transform-runtime/
//       and figure out whether we should switch to using version 6:
//       https://github.com/vuejs/vue-loader/issues/96#issuecomment-162910917
