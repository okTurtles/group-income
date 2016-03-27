// We're doing this hack for now
// See: https://github.com/okTurtles/group-income-simple/issues/23
require("babel-polyfill") // required. http://stackoverflow.com/a/34195553/1781435
require('babel-register')({'presets': ['es2015', 'stage-3']})
module.exports = require('./.Gruntfile.babel.js')
