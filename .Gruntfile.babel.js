/*
Reading material:

http://chris.house/blog/grunt-configuration-for-react-browserify-babelify/
https://www.reddit.com/r/javascript/comments/352f83/using_browserify_babelify_with_es6_modules_anyway/
http://www.sitepoint.com/setting-up-es6-project-using-babel-browserify/
https://babeljs.io/docs/setup/#browserify
*/

var fs = require('fs')
var path = require('path')
var url = require('url')
var S = require('string')
var vueify = require('vueify')
var pathmodify = require('pathmodify')

import fromPairs from 'lodash-es/fromPairs'

// EJS support at the bottom of the file, below grunt setup

var development = process.env.NODE_ENV === 'development'

module.exports = (grunt) => {
  require('load-grunt-tasks')(grunt)

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    checkDependencies: {this: {options: {install: true}}},

    watch: {
      // prevent watch from spawning. if we don't do this, we won't be able
      // to kill the child when files change.
      options: {spawn: false},
      // consider instead using the `watchify` option on browserify
      browserify: {
        options: { livereload: true }, // port 35729 by default
        files: ['frontend/*.html', 'frontend/simple/**/*.{vue,ejs,js}'],
        tasks: ['exec:standard', 'copy', 'browserify']
      },
      css: {
        options: { livereload: true },
        files: ['frontend/simple/sass/**/*.{sass,scss}'],
        tasks: ['sass']
      },
      html: {
        options: { livereload: true },
        files: ['frontend/simple/**/*.html'],
        tasks: ['copy']
      },
      backend: {
        files: ['backend/**/*.js'],
        tasks: ['exec:standard', 'backend:relaunch']
      },
      gruntfile: {
        files: ['.Gruntfile.babel.js', 'Gruntfile.js'],
        tasks: ['exec:standardgrunt']
      }
    },

    browserify: browserifyCfg({
      straight: [{ 'dist/simple/app.js': ['frontend/simple/main.js'] }],
      lazy: [{ 'dist/simple/js/UserGroupView.js': ['frontend/simple/views/UserGroupView.vue'] }]
    }),

    sass: {
      options: {
        sourceMap: development,
        // sourceMapRoot: '/',
        outputStyle: development ? 'nested' : 'compressed',
        includePaths: ['./node_modules/bulma', './node_modules/font-awesome/scss']
      },
      dev: {
        files: [{
          expand: true,
          cwd: 'frontend/simple/sass',
          src: ['*.{sass,scss}', '!_*/**'],
          dest: 'dist/simple/css/',
          ext: '.css'
        }]
      }
    },

    copy: {
      html_files: {
        cwd: 'frontend/',
        src: ['**/*.html', '!_*/**'], // folders with _ don't get copied
        dest: 'dist',
        expand: true
      },
      assets: {
        cwd: 'frontend/simple/assets',
        src: ['**/*'],
        dest: 'dist/simple',
        expand: true
      }
    },

    // https://github.com/sindresorhus/grunt-shell is another nice alternative
    exec: {
      // could replace w/https://github.com/pghalliday/grunt-mocha-test
      test: './node_modules/.bin/mocha --compilers js:babel-register -R spec --bail',
      standard: './node_modules/.bin/standard',
      standardgrunt: './node_modules/.bin/standard .Gruntfile.babel.js Gruntfile.js'
    },

    clean: { dist: ['dist/*', './sqlite.db'] },

    connect: {
      options: {
        port: process.env.FRONTEND_PORT,
        base: 'dist',
        livereload: process.env.NODE_ENV === 'development',
        middleware: (connect, opts, middlewares) => {
          middlewares.unshift((req, res, next) => {
            var f = url.parse(req.url).pathname
            f = path.join('dist', S(f).endsWith('/') ? f + 'index.html' : f)
            if (/^dist\/(frontend|node_modules)\/.*\.(sass|scss|js|vue|ejs)$/.test(f)) {
              // handle serving source-maps
              res.end(fs.readFileSync(S(f).chompLeft('dist/').s))
            } else if (S(f).endsWith('.html') && fs.existsSync(f)) {
              // parse all HTML files for SSI
              res.end(fs.readFileSync(f))
            } else if (S(f).startsWith('dist/simple/') && !/\.[a-z][a-z0-9]+(\?[^\/]*)?$/.test(f)) {
              // if we are a vue-router route, send main index file
              console.log(`Req: ${req.url}, sending index.html for: ${f}`)
              res.end(fs.readFileSync('dist/simple/index.html'))
            } else {
              next() // otherwise send the resource itself, whatever it is
            }
          })
          return middlewares
        }
      },
      dev: {}
    }
    // see also:
    // https://github.com/lud2k/grunt-serve
    // https://github.com/substack/watchify
    // https://github.com/AgentME/browserify-hmr
    // https://medium.com/@dan_abramov/the-death-of-react-hot-loader-765fa791d7c4

  })

  // -------------------------------------------------------------------------
  //  Grunt Tasks
  // -------------------------------------------------------------------------

  grunt.registerTask('default', ['dev'])
  grunt.registerTask('backend', ['backend:relaunch', 'watch'])
  grunt.registerTask('dev', ['checkDependencies', 'build', 'connect', 'backend'])
  grunt.registerTask('build', ['exec:standard', 'copy', 'sass', 'browserify'])
  grunt.registerTask('dist', ['build'])
  grunt.registerTask('test', ['dist', 'connect', 'exec:test'])
  // TODO: add 'deploy' per:
  //       https://github.com/okTurtles/group-income-simple/issues/10

  // -------------------------------------------------------------------------
  //  Code for running backend server at the same time as frontend server
  // -------------------------------------------------------------------------

  // var node6 = process.versions.node.split('.')[0] >= 6
  var fork = require('child_process').fork
  var child = null

  grunt.registerTask('backend:relaunch', '[internal]', function () {
    var done = this.async() // tell grunt we're async
    var fork2 = function () {
      grunt.log.writeln('backend: forking...')
      child = fork('./backend/index.js', process.argv, {execArgv: ['-r', 'babel-register']})
      child.on('error', (err) => {
        if (err) {
          console.error('error starting or sending message to child:', err)
          process.exit(1)
        }
      })
      child.on('exit', (c) => {
        if (c !== 0) {
          grunt.log.error(`child exited with error code: ${c}`.bold)
          process.exit(c || -1)
        }
      })
      done()
    }
    if (child) {
      grunt.log.writeln('Killing child!')
      // wait for successful shutdown to avoid EADDRINUSE errors
      child.on('message', fork2)
      child.send({})
    } else {
      fork2()
    }
  })
}

// ----------------------------------------
// For generating lazy-loaded components
// ----------------------------------------

function browserifyCfg ({straight, lazy}, cfg = {}) {
  var globalize = x => // views/UserGroupView.vue -> UserGroupView
    S(path.parse(x).name).dasherize().capitalize().camelize().s
  var keyify = x => // views/UserGroupView.vue -> userGroupView
    S(path.parse(x).name).dasherize().chompLeft('-').camelize().s
  function gencfg (out, paths, isLazy) {
    var c = {
      options: {
        transform: [script2ify, 'vueify', ejsify, 'babelify'],
        plugin: [[pathmodify, {
          // we remap it to 'lodash' and require functions like so: import mapValues from 'lodash/mapValues'
          // otherwise we get this bizarre error:
          // ParseError: 'import' and 'export' may appear only with 'sourceType: module'
          mods: pathmodify.mod.dir('lodash-es', path.join(__dirname, 'node_modules', 'lodash-es'), 'lodash')
        }]],
        browserifyOptions: {
          debug: development // enables source maps
        }
      },
      files: fromPairs([[out, paths]])
    }
    if (isLazy) {
      c.options.browserifyOptions.standalone = globalize(out)
      c.options.exclude = ['vue', 'vue-hot-reload-api']
    }
    return c
  }
  for (let map of straight) {
    for (let out in map) {
      cfg[keyify(out)] = gencfg(out, map[out], false)
    }
  }
  for (let map of lazy) {
    for (let out in map) {
      cfg[keyify(out)] = gencfg(out, map[out], true)
    }
  }
  return cfg
}

// ----------------------------------------
// EJS support for .vue files + via require
// TODO: move this to some nicer place. A grunt folder
//       would also allow us to move this entire file.
// ----------------------------------------
var through = require('through2')

// per: https://github.com/vuejs/vue-loader/issues/197#issuecomment-205617193
vueify.compiler.applyConfig({
  customCompilers: {
    ejs: function (content, cb, compiler, filepath) {
      cb(null, loadEJS(filepath, content)())
    }
  }
})
// TODO: see comment in simple/js/utils.js
function loadEJS (path, str) {
  return require('ejs').compile(str, {
    filename: path,
    compileDebug: development,
    client: true // needed for generating the module.exports string in ejsify
  })
}
// with inspiration from the ejsify package
function ejsify (file) {
  return !S(file).endsWith('.ejs')
  ? through()
  : through(function (buf, encoding, cb) {
    // see comment in test.ejs for why waitForGlobal is no longer used
    // cb(null, `module.exports = (${loadEJS(file, buf.toString('utf8'))})({waitForGlobal: ${waitForGlobal}})`)
    cb(null, `module.exports = (${loadEJS(file, buf.toString('utf8'))})()`)
  })
}

// This will replace <script> with <script2> in .html, .vue and .ejs files
// EXCEPT:
// - within <!-- comments -->
// - top-level <script> tags within .vue files
// Additional exclusion per: http://www.rexegg.com/regex-best-trick.html
// Excluding <pre> tags did not seem to work, however.
function script2ify (file) {
  return !/\.(vue|html|ejs)$/.test(file) // edit to support other file types
  ? through()
  : through(function (buf, encoding, cb) {
    // avoid replacing top-level <script> tags in .vue files
    var regex = /\.vue$/.test(file)
    ? /<!--.*?-->|^<script>|^<\/script>|(?:<(\/)?script([ >]))/gm
    : /<!--.*?-->|(?:<(\/)?script([ >]))/gm
    var replacement = (m, p1, p2) => p2 ? `<${p1 || ''}script2${p2}` : m
    cb(null, buf.toString('utf8').replace(regex, replacement))
  })
}
