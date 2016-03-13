/*
Reading material:

http://chris.house/blog/grunt-configuration-for-react-browserify-babelify/
https://www.reddit.com/r/javascript/comments/352f83/using_browserify_babelify_with_es6_modules_anyway/
http://www.sitepoint.com/setting-up-es6-project-using-babel-browserify/
https://babeljs.io/docs/setup/#browserify

https://github.com/babel/babelify
https://github.com/jmreidy/grunt-browserify
https://github.com/substack/watchify
https://github.com/vuejs/vueify
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

    watch: { // https://github.com/gruntjs/grunt-contrib-watch
      // prevent watch from spawning. if we don't do this, we won't be able
      // to kill the child when files change.
      options: {spawn: false},
      browserify: {
        files: ['<%= files.frontend %>'],
        tasks: ['standard', 'browserify']
      },
      livereload: {
        options: { livereload: true }, // port 35729 by default
        files: ['dist/**/*']
      },
      backend: {
        files: ['backend/**/*.js'],
        tasks: ['standard', 'backend:relaunch']
      }
    },

    browserify: {
      dist: {
        options: {
          transform: ['vueify', ['babelify', {presets: ['es2015', 'stage-3']}]]
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

    standard: { dev: {} },

    execute: {
      api_server: { src: 'backend/index.js' },
      api_test: {
        src: './node_modules/.bin/mocha',
        options: { args: ['-R', 'spec', '--bail', 'test/'] }
      },
      // we don't do `standard` linting this way (output not as pretty)
      // but keep it around just to show the alternative
      standard: { src: './node_modules/standard/bin/cmd.js' }
    },

    clean: { dist: ['dist/*', './sqlite.db'] },

    connect: { // https://github.com/gruntjs/grunt-contrib-connect
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
    // TODO: see also
    //       https://github.com/vuejs/vueify
    //       https://github.com/lud2k/grunt-serve
    //       https://github.com/substack/watchify
    //       https://github.com/AgentME/browserify-hmr
    //       https://medium.com/@dan_abramov/the-death-of-react-hot-loader-765fa791d7c4

  })

  // -------------------------------------------------------------------------
  //  Grunt Tasks
  // -------------------------------------------------------------------------

  grunt.registerTask('default', ['dev'])
  grunt.registerTask('backend', ['backend:relaunch', 'watch'])
  grunt.registerTask('dev', ['build', 'connect', 'backend']) // backend calls watch
  grunt.registerTask('build', ['standard', 'copy', 'browserify'])
  grunt.registerTask('dist', ['build'])
  // TODO: make it so you don't have to run `grunt test` in a separate terminal window
  //       simplest way would be to edit the file `test/index.js` to run the server
  grunt.registerTask('test', ['execute:api_test'])

  // -------------------------------------------------------------------------
  //  Code for running backend server at the same time as frontend server
  // -------------------------------------------------------------------------

  var child = {running: false}

  grunt.registerTask('backend:relaunch', '[internal]', function () {
    var done = this.async() // tell grunt we're async

    if (child.running) {
      grunt.log.writeln('Killing child!')
      child.running = false
      child.proc.kill('SIGINT') // nicer...
    }
    var fork2 = (child) => {
      grunt.log.writeln('backend: forking...')
      var spawnOpts = {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'inherit'
      }
      child.proc = fork('./backend/index.js', process.argv, spawnOpts)
      child.running = true
      child.proc.on('exit', (c) => {
        if (child.running) {
          grunt.log.error `child exited with code: ${c}`
          process.exit(c)
        }
      })
      done()
    }
    setTimeout(fork2, 1000, child) // 1 second later
  })
}

