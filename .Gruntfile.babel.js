/*
Reading material:

http://chris.house/blog/grunt-configuration-for-react-browserify-babelify/
https://www.reddit.com/r/javascript/comments/352f83/using_browserify_babelify_with_es6_modules_anyway/
http://www.sitepoint.com/setting-up-es6-project-using-babel-browserify/
https://babeljs.io/docs/setup/#browserify
*/
import _ from 'lodash'
import {setupPrimus} from './shared/functions'

const fs = require('fs')
const path = require('path')
const url = require('url')
const S = require('string')
const vueify = require('vueify')
const pathmodify = require('pathmodify')

const development = process.env.NODE_ENV === 'development'
const livereload = development && (parseInt(process.env.PORT_SHIFT || 0) + 35729)

setupPrimus(require('http').createServer(), true)

// per: https://github.com/vuejs/vueify#configuring-options
//      https://github.com/vuejs/vue-loader/issues/197#issuecomment-205617193
vueify.compiler.applyConfig({ sass: sassCfg() })

module.exports = (grunt) => {
  require('load-grunt-tasks')(grunt)

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    checkDependencies: {this: {options: { install: true }}},

    watch: {
      // prevent watch from spawning. if we don't do this, we won't be able
      // to kill the child when files change.
      options: {spawn: false},
      // consider instead using the `watchify` option on browserify
      browserify: {
        options: { livereload },
        files: ['frontend/*.html', 'frontend/simple/**/*.{vue,js}'],
        tasks: ['exec:standard', 'exec:stylelint', 'copy', 'browserify']
      },
      css: {
        options: { livereload },
        files: ['frontend/simple/assets/sass/**/*.{sass,scss}'],
        tasks: ['sass']
      },
      html: {
        options: { livereload },
        files: ['frontend/simple/**/*.html'],
        tasks: ['copy']
      },
      backend: {
        files: ['backend/**/*.js'],
        tasks: ['exec:standard', 'backend:relaunch']
      },
      shared: {
        options: { livereload },
        files: ['shared/**/*.js'],
        tasks: ['exec:standard', 'browserify', 'backend:relaunch']
      },
      gruntfile: {
        files: ['.Gruntfile.babel.js', 'Gruntfile.js'],
        tasks: ['exec:standardgrunt']
      }
    },

    browserify: browserifyCfg({
      straight: [{ 'dist/simple/app.js': ['frontend/simple/main.js'] }],
      lazy: [{ 'dist/simple/views/UserGroup.js': ['frontend/simple/views/UserGroup.vue'] }]
    }),

    sass: {
      options: sassCfg(),
      dev: {
        files: [{
          expand: true,
          cwd: 'frontend/simple/assets/sass',
          src: ['*.{sass,scss}', '!_*/**'],
          dest: 'dist/simple/assets/css/',
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
        src: ['**/*', '!sass/**'],
        dest: 'dist/simple/assets',
        expand: true
      }
    },

    // https://github.com/sindresorhus/grunt-shell is another nice alternative
    exec: {
      // could replace w/https://github.com/pghalliday/grunt-mocha-test
      // test files:
      //    - anything in /test folder, eg. integration tests
      //    - anything that ends with .test.js, eg. unit tests for sbp domains kept in the domain folder
      test: {
        cmd: './node_modules/.bin/mocha --require Gruntfile.js --exit -R spec --bail "{./{,!(node_modules)/**/}*.test.js,./test/*.js}"',
        options: {env: {LOAD_NO_FILE: 'true', ...process.env}}
      },
      standard: './node_modules/.bin/standard "**/*.{js,vue}"',
      standardgrunt: './node_modules/.bin/standard .Gruntfile.babel.js Gruntfile.js',
      stylelint: './node_modules/.bin/stylelint "frontend/simple/**/*.{css,scss,vue}"',
      flow: './node_modules/.bin/flow'
    },

    clean: { dist: ['dist/*', './sqlite.db'] },

    connect: {
      options: {
        port: process.env.FRONTEND_PORT,
        base: 'dist',
        livereload: livereload,
        middleware: (connect, opts, middlewares) => {
          middlewares.unshift((req, res, next) => {
            var f = url.parse(req.url).pathname
            f = path.join('dist', S(f).endsWith('/') ? f + 'index.html' : f)
            if (/^dist\/(frontend|node_modules)\/.*\.(sass|scss|js|vue)$/.test(f)) {
              // handle serving source-maps
              res.end(fs.readFileSync(S(f).chompLeft('dist/').s))
            } else if (S(f).endsWith('.html') && fs.existsSync(f)) {
              // parse all HTML files for SSI
              // TODO: delete this section?
              res.end(fs.readFileSync(f))
            } else if (S(f).startsWith('dist/simple/') && !/\.[a-z][a-z0-9]+(\?[^/]*)?$/.test(f)) {
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
  grunt.registerTask('build', ['exec:standard', 'exec:stylelint', 'copy', 'sass', 'browserify'])
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

  process.on('exit', () => { // 'beforeExit' doesn't work
    // In cases where 'watch' fails while child (server) is still running
    // we will exit and child will continue running in the background.
    // This can happen, for example, when running two GIS instances via
    // the PORT_SHIFT envar. If grunt-contrib-watch livereload process
    // cannot bind to the port for some reason, then the parent process
    // will exit leaving a dangling child server process.
    if (child) {
      grunt.log.writeln('Quitting dangling child!')
      child.send({})
    }
  })

  grunt.registerTask('backend:relaunch', '[internal]', function () {
    var done = this.async() // tell grunt we're async
    var fork2 = function () {
      grunt.log.writeln('backend: forking...')
      child = fork('Gruntfile.js', process.argv, {
        env: {LOAD_TARGET_FILE: './backend/index.js', ...process.env}
      })
      child.on('error', (err) => {
        if (err) {
          console.error('error starting or sending message to child:', err)
          process.exit(1)
        }
      })
      child.on('exit', (c) => {
        if (c !== 0) {
          grunt.log.error(`child exited with error code: ${c}`.bold)
          // ^C can cause c to be null, which is an OK error
          process.exit(c || 0)
        }
        child = null
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
// SASS specific stuff
// ----------------------------------------

// This is used by grunt-sass and vueify
function sassCfg () {
  return {
    sourceMap: development,
    // https://github.com/vuejs/vueify/issues/34#issuecomment-161722961
    // indentedSyntax: true,
    // sourceMapRoot: '/',
    outputStyle: development ? 'nested' : 'compressed',
    includePaths: ['./node_modules/bulma', './node_modules/font-awesome/scss']
  }
}

// ----------------------------------------
// For generating lazy-loaded components
// ----------------------------------------

function browserifyCfg ({straight, lazy}, cfg = {}) {
  var globalize = x => // views/UserGroupView.vue -> UserGroupView
    S(path.parse(x).name).dasherize().capitalize().camelize().s
  var keyify = x => // views/UserGroupView.vue -> userGroupView
    S(path.parse(x).name).dasherize().chompLeft('-').camelize().s
  var p = (s, ...v) => _.flatten(_.zip(s, v)).join('').replace('/', path.sep)

  function gencfg (out, paths, isLazy) {
    var c = {
      options: {
        transform: [script2ify, 'vueify', 'babelify'],
        plugin: [[pathmodify, {
          mods: [
            // some libraries (like jquery-validity) require('jquery')
            // pathmodify.mod.re(/^jquery$/i, 'sprint-js'),
            // pathmodify.mod.dir('vendor', p`${__dirname}/frontend/simple/assets/vendor`),
            // https://vuejs.org/v2/guide/installation.html#Standalone-vs-Runtime-only-Build
            pathmodify.mod.id('vue', p`${__dirname}/node_modules/vue/dist/vue.common.js`)
          ]
        }]],
        browserifyOptions: {
          debug: development // enables source maps
        }
      },
      files: _.fromPairs([[out, paths]])
    }
    // doing a different cache file for each out file is clearly faster as
    // demonstrated by successive runs of `grunt test`
    c.options.cacheFile = `./dist/${globalize(out)}-cache.json`
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

// This will replace <script> with <script2> in .html and .vue files
// EXCEPT:
// - within <!-- comments -->
// - top-level <script> tags within .vue files
// Additional exclusion per: http://www.rexegg.com/regex-best-trick.html
// Excluding <pre> tags did not seem to work, however.
function script2ify (file) {
  return !/\.(vue|html)$/.test(file) // edit to support other file types
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
