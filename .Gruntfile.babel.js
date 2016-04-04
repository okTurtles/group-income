/*
Reading material:

http://chris.house/blog/grunt-configuration-for-react-browserify-babelify/
https://www.reddit.com/r/javascript/comments/352f83/using_browserify_babelify_with_es6_modules_anyway/
http://www.sitepoint.com/setting-up-es6-project-using-babel-browserify/
https://babeljs.io/docs/setup/#browserify
*/

var SSI = require('node-ssi')
var ssi = new SSI({baseDir: './dist', encoding: 'utf-8'})
var fs = require('fs')
var path = require('path')
var url = require('url')
var S = require('string')
var fork = require('child_process').fork

module.exports = grunt => {
  require('load-grunt-tasks')(grunt)

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    files: {
      frontend: ['frontend/**/*.{vue,js}', '!frontend/_static/**']
    },

    watch: {
      // prevent watch from spawning. if we don't do this, we won't be able
      // to kill the child when files change.
      options: {spawn: false},
      // consider instead using the `watchify` option on browserify
      browserify: {
        options: { livereload: true }, // port 35729 by default
        files: ['<%= files.frontend %>'],
        tasks: ['standard:dev', 'browserify']
      },
      backend: {
        files: ['backend/**/*.js'],
        tasks: ['standard:dev', 'backend:relaunch']
      },
      gruntfile: {
        files: ['.Gruntfile.babel.js', 'Gruntfile.js'],
        tasks: ['standard:gruntfile']
      }
    },

    browserify: {
      dev: {
        options: {
          transform: ['vueify', 'babelify'],
          browserifyOptions: {
            debug: process.env.NODE_ENV === 'development' // enables source maps
          }
        },
        files: { 'dist/simple/app.js': ['<%= files.frontend %>'] }
      }
    },

    copy: {
      resources: { // TODO: these might be moved to a git submodule later
        cwd: 'frontend/_static/',
        src: ['css/**', 'images/**', 'js/vendor/**'],
        dest: 'dist',
        expand: true
      },
      frontend: {
        cwd: 'frontend/',
        src: ['**/*.html', '!_*/**'], // folders with _ don't get copied
        dest: 'dist',
        expand: true
      }
    },

    standard: {
      // everything except standard ignore (following options in package.json)
      dev: {},
      // explicitely lint gruntfile as leading '.' causes it to be ignored
      gruntfile: {src: ['.Gruntfile.babel.js', 'Gruntfile.js']}
    },

    execute: {
      api_test: {
        src: './node_modules/.bin/mocha',
        options: { args: ['--compilers', 'js:babel-register', '-R', 'spec', '--bail', 'test/'] }
      },
      // we don't do `standard` linting this way (output not as pretty)
      // but keep it around just to show the alternative
      standard: { src: './node_modules/standard/bin/cmd.js' }
    },

    clean: { dist: ['dist/*', './sqlite.db'] },

    connect: {
      options: {
        port: 8000,
        base: 'dist',
        livereload: true,
        middleware: (connect, opts, middlewares) => {
          var serveSsiFile = (path, req, res) => {
            ssi.compileFile(path, (err, content) => {
              if (err) {
                console.error(err.stack)
                throw err
              }
              console.log(`Req: ${req.url} => sending node-ssi parsed file: ${path}`)
              res.end(content)
            })
          }
          middlewares.unshift((req, res, next) => {
            var f = url.parse(req.url).pathname
            f = path.join('dist', S(f).endsWith('/') ? f + 'index.html' : f)
            if (S(f).endsWith('.html') && fs.existsSync(f)) {
              serveSsiFile(f, req, res)
            } else if (S(f).startsWith('dist/simple/') && !S(f).endsWith('.js')) {
              serveSsiFile('dist/simple/index.html', req, res)
            } else {
              next()
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
  grunt.registerTask('dev', ['build', 'connect', 'backend']) // backend calls watch
  grunt.registerTask('build', ['standard', 'copy', 'browserify'])
  grunt.registerTask('dist', ['build'])
  grunt.registerTask('test', ['standard', 'execute:api_test'])
  // TODO: add 'deploy'

  // -------------------------------------------------------------------------
  //  Code for running backend server at the same time as frontend server
  // -------------------------------------------------------------------------

  var child = null

  grunt.registerTask('backend:relaunch', '[internal]', function () {
    var done = this.async() // tell grunt we're async
    var fork2 = function () {
      grunt.log.writeln('backend: forking...')
      child = fork('./backend/index.js', process.argv, {
        execArgv: ['-r', 'babel-register'],
        cwd: process.cwd(),
        env: process.env
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
