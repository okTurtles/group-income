// We're doing this hack for now
// See: https://github.com/okTurtles/group-income-simple/issues/23
var _ = require('lodash')
require('babel-polyfill') // required. http://stackoverflow.com/a/34195553/1781435
_.assign(process.env, {
  NODE_ENV: _.intersection(process.argv, ['dist', 'deploy'])[0] ? 'production' : 'development',
  API_PORT: 3000,
  API_URL: 'http://localhost:3000',
  FRONTEND_URL: 'http://localhost:8000'
})
require('babel-register')({
  presets: ['es2015', 'stage-3'],
  plugins: ['transform-inline-environment-variables']
})
module.exports = require('./.Gruntfile.babel.js')
