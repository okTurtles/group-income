'use strict'

import sbp from '~/shared/sbp.js'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import alias from 'rollup-plugin-alias'
import babel from 'rollup-plugin-babel'
import VuePlugin from 'rollup-plugin-vue'
import flowRemoveTypes from 'flow-remove-types'
import json from 'rollup-plugin-json'
import globals from 'rollup-plugin-node-globals'
import { eslint } from 'rollup-plugin-eslint'
import css from 'rollup-plugin-css-only'
import scssVariable from 'rollup-plugin-sass-variables'
import { createFilter } from 'rollup-pluginutils'
import transpile from 'vue-template-es2015-compiler'
const compiler = require('vue-template-compiler') // NOTE: import doesnt work here?

// import collectSass from 'rollup-plugin-collect-sass'
// import sass from 'rollup-plugin-sass'
// import scss from 'rollup-plugin-scss'
// import browserifyPlugin from 'rollup-plugin-browserify-transform'
// https://github.com/4lejandrito/rollup-plugin-browsersync

// import rollup from 'rollup'
const rollup = require('rollup')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const url = require('url')

const development = process.env.NODE_ENV === 'development'
const livereload = development && (parseInt(process.env.PORT_SHIFT || 0) + 35729)

const distDir = 'dist'
const distAssets = `${distDir}/assets`
const distJS = `${distAssets}/js`
const distCSS = `${distAssets}/css`

module.exports = (grunt) => {
  require('load-grunt-tasks')(grunt)

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    checkDependencies: { this: { options: { install: true } } },

    watch: {
      // prevent watch from spawning. if we don't do this, we won't be able
      // to kill the child when files change.
      options: { spawn: false },
      rollup: {
        options: { livereload },
        files: [`${distJS}/main.js`]
      },
      css: {
        options: { livereload },
        files: ['frontend/assets/**/*.{sass,scss}'],
        tasks: ['sass']
      },
      html: {
        options: { livereload },
        files: ['frontend/**/*.html'],
        tasks: ['copy']
      },
      puglint: {
        files: ['frontend/views/**/*.vue'],
        tasks: ['exec:puglint']
      },
      backend: {
        files: ['backend/**/*.js', 'shared/**/*.js'],
        tasks: ['exec:eslint', 'backend:relaunch']
      },
      gruntfile: {
        files: ['.Gruntfile.babel.js', 'Gruntfile.js'],
        tasks: ['exec:eslintgrunt']
      }
    },

    sass: {
      options: {
        implementation: require('node-sass'),
        sourceMap: development,
        // https://github.com/vuejs/vueify/issues/34#issuecomment-161722961
        // indentedSyntax: true,
        // sourceMapRoot: '/',
        outputStyle: development ? 'nested' : 'compressed'
      },
      dev: {
        files: [{
          expand: true,
          cwd: 'frontend/assets/style',
          src: ['*.{sass,scss}', '!_*/**'],
          dest: distCSS,
          ext: '.css'
        }]
      }
    },

    copy: {
      node_modules: {
        cwd: 'node_modules',
        src: ['systemjs/dist/*.{js,map}'],
        dest: distJS,
        expand: true,
        flatten: true
      },
      html_files: {
        src: 'frontend/index.html',
        dest: `${distDir}/index.html`
      },
      assets: {
        cwd: 'frontend/assets',
        src: ['**/*', '!style/**', '!svgs/**', 'svgs/compressed/**'],
        dest: distAssets,
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
        cmd: 'node node_modules/mocha/bin/mocha --require Gruntfile.js --exit -R spec --bail "{./{,!(node_modules|test)/**/}*.test.js,./test/*.js}"',
        options: { env: { LOAD_NO_FILE: 'true', ...process.env } }
      },
      // https://github.com/standard/standard/issues/750#issuecomment-379294276
      eslint: 'node ./node_modules/eslint/bin/eslint.js "**/*.{js,vue}"',
      eslintgrunt: "./node_modules/.bin/eslint --ignore-pattern '!.*.js' .Gruntfile.babel.js Gruntfile.js",
      puglint: './node_modules/.bin/pug-lint-vue frontend/views',
      stylelint: 'node ./node_modules/stylelint/bin/stylelint.js "frontend/assets/style/**/*.{css,scss,vue}"',
      flow: './node_modules/.bin/flow'
    },

    clean: { dist: [`${distDir}/*`] },

    connect: {
      options: {
        port: process.env.FRONTEND_PORT,
        useAvailablePort: true,
        base: 'dist',
        livereload: livereload,
        middleware: (connect, opts, middlewares) => {
          middlewares.unshift((req, res, next) => {
            var f = url.parse(req.url).pathname // eslint-disable-line
            if (f !== undefined) {
              if (/^\/app(\/|$)/.test(f)) {
                // NOTE: if you change the URL from /app you must modify it here,
                //       and also:
                //       - page() function in `frontend/test.js`
                //       - base property in `frontend/simple/controller/router.js`
                console.log(chalk.grey(`Req: ${req.url}, sending index.html for: ${f}`))
                res.end(fs.readFileSync(`${distDir}/index.html`))
              // NOTE: next we check for sourcemapped files
              } else if (/^\/(frontend|shared|node_modules)\//.test(f)) {
                // NOTE: we will not be doing this or using this in production
                console.log(chalk`{grey Req: ${req.url},} sending dev file`)
                res.end(fs.readFileSync(f.slice(1)))
              } else {
                console.log(chalk.grey(`sending: ${req.url}`))
                next() // otherwise send the resource itself, whatever it is
              }
            }
          })
          return middlewares
        }
      },
      dev: {}
    },

    svg_sprite: {
      optimizeOnly: {
        cwd: 'frontend/assets/svgs/original',
        dest: 'frontend/assets/svgs/compressed',
        src: ['*.svg'],
        options: {
          shape: {
            dest: './',
            transform: [{
              svgo: {
                plugins: [
                  { cleanupIDs: true },
                  { removeTitle: true },
                  { removeDesc: true },
                  { removeUselessStrokeAndFill: true },
                  { removeViewBox: false },
                  { removeDimensions: true }, // SVGO BUG # https://github.com/svg/svgo/issues/871
                  { cleanupNumericValues: { floatPrecision: 2 } },
                  { convertPathData: { floatPrecision: 2 } },
                  { convertTransform: { floatPrecision: 2 } },
                  { cleanupListOfValues: { floatPrecision: 2 } }
                ]
              }
            }]
          }
        }
      }
      // NOTE: When we need a sprite in the future:
      // newcomers: {
      //   cwd: 'frontend/assets/svg',
      //   dest: 'frontend/assets/svg/sprites',
      //   options: {
      //     mode: {
      //       symbol: {
      //         sprite: `../newcomers.svg`
      //       }
      //     }
      //   }
      //   src: [
      //     'svg-broken-link.svg',
      //     'svg-create-group.svg',
      //     'svg-invitation.svg',
      //     'svg-join-group.svg'
      //   ]
      // },
    }
    // see also:
    // https://github.com/lud2k/grunt-serve
    // https://medium.com/@dan_abramov/the-death-of-react-hot-loader-765fa791d7c4
  })

  // -------------------------------------------------------------------------
  //  Grunt Tasks
  // -------------------------------------------------------------------------

  grunt.registerTask('default', ['dev'])
  grunt.registerTask('dev', ['checkDependencies', 'build:watch', 'connect', 'backend:relaunch', 'watch'])
  grunt.registerTask('dist', ['build'])
  grunt.registerTask('test', ['build', 'connect', 'backend:launch', 'exec:test', 'cypress'])
  grunt.registerTask('test:unit', ['build', 'backend:launch', 'exec:test'])

  // TODO: add 'deploy' per:
  //       https://github.com/okTurtles/group-income-simple/issues/10

  grunt.registerTask('build', function () {
    const rollup = this.flags.watch ? 'rollup:watch' : 'rollup'
    if (this.flags.watch) {
      // if we are being run with 'grunt dev', tell Primus to generate the file
      // ./frontend/controller/utils/primus.js, otherwise, this is 'grunt test', and this
      // block will be skipped so that pubsub.js can be required through ./backend/index.js
      require('~/backend/pubsub.js') // hack to register 'backend/pubsub/setup' selector
      sbp('backend/pubsub/setup', require('http').createServer(), true)
    }
    if (!grunt.option('skipbuild')) {
      grunt.task.run(['exec:eslint', 'exec:puglint', 'exec:stylelint', 'copy', 'sass', 'svg_sprite', rollup])
    }
  })

  grunt.registerTask('cypress', function () {
    const cypress = require('cypress')
    const done = this.async()
    const command = grunt.option('browser') === 'debug' ? 'open' : 'run'

    // https://docs.cypress.io/guides/guides/module-api.html
    const options = {
      run: {
        headed: grunt.option('browser') === true
      },
      open: {
        // add cypress.open() options here
      }
    }[command]
    grunt.log.writeln(`cypress: running in "${command}" mode...`)
    cypress[command](options).then(r => done(r.totalFailed === 0)).catch(done)
  })

  // -------------------------------------------------------------------------
  //  Code for running backend server at the same time as frontend server
  // -------------------------------------------------------------------------

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

  // used with `grunt dev` only, makes it possible to restart just the server when
  // backend files are modified (in conjunction with grunt-contrib-watch)
  grunt.registerTask('backend:relaunch', '[internal]', function () {
    const done = this.async() // tell grunt we're async
    const fork2 = function () {
      grunt.log.writeln('backend: forking...')
      child = fork('Gruntfile.js', process.argv, {
        env: { LOAD_TARGET_FILE: './backend/index.js', ...process.env }
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
      })
      done()
    }
    if (child) {
      grunt.log.writeln('Killing child!')
      // wait for successful shutdown to avoid EADDRINUSE errors
      child.on('message', () => {
        child = null
        fork2()
      })
      child.send({})
    } else {
      fork2()
    }
  })

  // useful helper task for `grunt test`
  grunt.registerTask('backend:launch', '[internal]', function () {
    const done = this.async()
    grunt.log.writeln('backend: launching...')
    require('./backend/index.js').then(done).catch(done)
  })

  // -----------------------
  // - Our rollup command
  // -----------------------

  grunt.registerTask('rollup', function () {
    let done = this.async()
    const watchFlag = this.flags.watch
    const watchOpts = {
      clearScreen: false,
      input: 'frontend/main.js',
      output: {
        format: 'system',
        dir: distJS,
        sourcemap: development,
        sourcemapPathTransform: relativePath => {
          // const relativePath2 = '/' + path.relative('../../../', relativePath)
          const relativePath2 = path.relative('../', relativePath)
          // console.log('RELATIVE PATH: ' + relativePath + ' => ' + relativePath2)
          return relativePath2
        }
      },
      external: ['crypto'],
      moduleContext: {
        'frontend/controller/utils/primus.js': 'window'
      },
      plugins: [
        alias({
          // https://vuejs.org/v2/guide/installation.html#Standalone-vs-Runtime-only-Build
          resolve: ['.vue', '.js', '.svg'],
          vue: path.resolve('./node_modules/vue/dist/vue.common.js'),
          '~': path.resolve('./'),
          '@model': path.resolve('./frontend/model'),
          '@utils': path.resolve('./frontend/utils'),
          '@views': path.resolve('./frontend/views'),
          '@pages': path.resolve('./frontend/views/pages'),
          '@components': path.resolve('./frontend/views/components'),
          '@containers': path.resolve('./frontend/views/containers'),
          '@view-utils': path.resolve('./frontend/views/utils'),
          '@assets': path.resolve('./frontend/assets'),
          '@svgs': path.resolve('./frontend/assets/svgs/compressed')

        }),
        resolve({
          // we set `preferBuiltins` to prevent rollup from erroring with
          // [!] (commonjs plugin) TypeError: Cannot read property 'warn' of undefined
          // TypeError: Cannot read property 'warn' of undefined
          preferBuiltins: false
        }),
        json(),
        // TODO: probably don't need browserifyPlugin, just implement ourselves here as a raw object
        //       per: https://rollupjs.org/guide/en#plugins-overview
        // browserifyPlugin(script2ify, { include: '*.{vue,html}' }),
        scssVariable(),
        // note there is a sourcemap bug for component.css: https://github.com/thgh/rollup-plugin-css-only/issues/10
        css({ output: `${distCSS}/component.css` }), // SUCCESS - spits out what's in .vue <style> tags
        // collectSass({ importOnce: true, extract: `${distCSS}/collectSass.css` }), // FAIL - flowtypes conflict
        // sass({ output: `${distCSS}/sass.css` }), // FAIL - flowtypes conflict
        // scss({ output: `${distCSS}/scss.css` }), // FAIL - produces empty bundle, probably only
        //                                              useful in the <script> section, i.e.
        //                                              <script>import 'foo.scss' ...
        eslint({ throwOnError: true, throwOnWarning: true }),
        svgLoader(),
        VuePlugin({
          // https://rollup-plugin-vue.vuejs.org/options.html
          // https://github.com/vuejs/rollup-plugin-vue/blob/master/src/index.ts
          // https://github.com/vuejs/vue-component-compiler#api
          needMap: false,
          css: false,
          style: {
            preprocessOptions: {
              scss: {
                // https://github.com/sass/node-sass#includepaths
                includePaths: [
                  // so that you can write things like this inside component style sections:
                  // @import 'vue-slider-component/lib/theme/default.scss';
                  path.resolve('./node_modules')
                ]
              }
            }
          }
        }),
        // VuePlugin(),
        flow({ all: true }),
        commonjs({
          // include: 'node_modules/**'
          namedExports: {
            'node_modules/vuelidate/lib/validators/index.js': ['required', 'between', 'email', 'minLength', 'requiredIf']
          },
          ignore: ['crypto']
        }),
        babel({
          runtimeHelpers: true,
          exclude: 'node_modules/**' // only transpile our source code
        }),
        globals() // for Buffer support
      ]
    }
    const watcher = rollup.watch(watchOpts)
    watcher.on('event', event => {
      const outputName = watchOpts.output.file || watchOpts.output.dir
      switch (event.code) {
        case 'BUNDLE_START':
          grunt.log.writeln(chalk`{green rollup:} ${event.input}`)
          break
        case 'START':
        case 'END':
          grunt.verbose.debug(this.nameArgs, event.code, event)
          break
        case 'BUNDLE_END':
          grunt.verbose.debug(this.nameArgs, event.code)
          grunt.log.writeln(chalk`{green created} {bold ${outputName}} {green in} {bold ${(event.duration / 1000).toFixed(1)}s}`)
          watchFlag || watcher.close() // stop watcher (only build once) if 'rollup:watch' isn't called
          done && done()
          // set done to undefined so that if we get an 'ERROR' event later
          // while in watch mode, it doesn't tell grunt that we're done twice
          done = undefined
          break
        case 'FATAL':
        case 'ERROR':
          grunt.log.error(this.nameArgs, event)
          watchFlag || watcher.close()
          done && done(false)
          done = undefined
          break
      }
    })
  })
}

// Using this instead of rollup-plugin-flow due to
// https://github.com/leebyron/rollup-plugin-flow/issues/5
function flow (options = {}) {
  return {
    name: 'flow-remove-types',
    transform: (code) => ({
      code: flowRemoveTypes(code, options).toString(),
      map: options.pretty ? { mappings: '' } : null
    })
  }
}

function svgLoader (options) {
  // Based on "rollup-plugin-vue-inline-svg" but better:
  // - fix sourcemaps bug on original plugin
  // - remove useless attrs and add global CSS class.
  const isSvg = createFilter('**/*.svg')
  return {
    name: 'vue-inline-svg',
    transform: (source, filePath) => {
      if (!isSvg(filePath)) return null
      const svgName = path.basename(filePath, '.svg')
      const svgClass = `svg-${svgName}`
      const svg = source
        // remove width and height attrs to be customized only by CSS
        // because SVGO can't do it at the moment (bug): https://github.com/svg/svgo/issues/871
        .replace(/width="[a-zA-Z0-9:]*"/, '')
        .replace(/height="[a-zA-Z0-9:]*"/, '')
        // add global class automatically for theming customization
        .replace('<svg', `<svg class="${svgClass}"`)

      const compiled = compiler.compile(svg, { preserveWhitespace: false })
      const code = transpile(`module.exports = { render: function () { ${compiled.render} } };`)
        // convert to ES6 modules
        .replace('module.exports =', 'export default')

      return {
        code,
        map: { mappings: '' }
      }
    }
  }
}

/*
// ----------------------------------------
// TODO: convert this to a pure rollup plugin
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
*/
