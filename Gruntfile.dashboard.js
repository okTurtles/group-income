'use strict'

// ========================================
// A Gruntfile.js for chelonia-dashboard front-end
// ========================================

const path = require('path')
const chalk = require('chalk')
const crypto = require('crypto')
const { readFile } = require('fs/promises')
const { fork } = require('child_process')

const applyPortShift = (env) => {
  // TODO: implement automatic port selection when `PORT_SHIFT` is 'auto'.
  const API_PORT = 8000 + Number.parseInt(env.PORT_SHIFT || '0')
  const API_URL = 'http://127.0.0.1:' + API_PORT

  if (Number.isNaN(API_PORT) || API_PORT < 8000 || API_PORT > 65535) {
    throw new RangeError(`Invalid API_PORT value: ${API_PORT}.`)
  }
  return { ...env, API_PORT, API_URL }
}

Object.assign(process.env, applyPortShift(process.env))

// paths
const dashboardRootDir = path.resolve(__dirname, 'backend/dashboard')
const resolvePathFromRoot = relPath => path.join(dashboardRootDir, relPath) // resolve a relative path against backend/dashboard folder
const distDir = path.resolve('dist-dashboard')
const distAssets = path.join(distDir, 'assets')
const distCSS = path.join(distDir, 'assets/css')
const distJS = path.join(distDir, 'assets/js')
const mainSrc = resolvePathFromRoot('main.js')
const mainScss = resolvePathFromRoot('assets/style/main.scss')
const backendIndex = 'backend/index.js'

const { NODE_ENV = 'development' } = process.env
const isDevelopment = NODE_ENV === 'development'
const isProduction = !isDevelopment

module.exports = (grunt) => {
  require('load-grunt-tasks')(grunt)

  const esbuildOptionsBag = {
    default: {
      bundle: true,
      loader: {
        '.eot': 'file',
        '.ttf': 'file',
        '.woff': 'file',
        '.woff2': 'file'
      },
      minifyIdentifiers: isProduction,
      minifySyntax: isProduction,
      minifyWhitespace: isProduction,
      sourcemap: isDevelopment,
      format: 'esm',
      external: ['*.eot', '*.ttf', '*woff', '*.woff2'],
      chunkNames: '[name]-[hash]-cached'
    },
    mainJS: {
      // main.js -> dist/assets/js/main.js
      entryPoints: [mainSrc],
      outdir: distJS,
      define: {
        'process.env.NODE_ENV': `'${NODE_ENV}'`
      },
      splitting: !grunt.option('no-chunks')
    },
    mainCss: {
      // assets/style/main.scss -> dist/assets/css/main.css
      entryPoints: [mainScss],
      outfile: path.join(distCSS, 'main.css')
    }
  }

  // Used by both the alias plugin and the Vue plugin.
  const aliasPluginOptions = {
    entries: {
      '@assets': './backend/dashboard/assets',
      '@views': './backend/dashboard/views',
      '@view-utils': './backend/dashboard/views/utils',
      '@common': './backend/dashboard/common',
      '@model': './backend/dashboard/model',
      '@components': './backend/dashboard/views/components',
      '@forms': './backend/dashboard/views/components/forms',
      '@containers': './backend/dashboard/views/containers',
      '@pages': './backend/dashboard/views/pages',
      '@validators': './node_modules/vuelidate/dist/validators.min.js', // without this, the app gets the mistery 'process() is not defined' runtime error.
      'vue': './node_modules/vue/dist/vue.esm.js', // without this, the app gets "[Vue warn]: You are using the runtime-only build of Vue" in the console.
      '~': '.'
    }
  }

  const browserSyncOptions = {
    cors: true,
    files: [
      `${distJS}/main.js`,
      `${distDir}/index.html`,
      `${distAssets}/**/*`,
      `${distCSS}/**/*`
    ],
    logLevel: 'info',
    open: false,
    port: 3030,
    proxy: {
      target: process.env.API_URL,
      ws: true
    },
    reloadDelay: 100,
    reloadThrottle: 2000,
    tunnel: grunt.option('tunnel') && `gi${crypto.randomBytes(2).toString('hex')}`
  }

  const puglintOptions = {}

  const eslintOptions = {
    format: 'stylish',
    throwOnError: false,
    throwOnWarning: false
  }

  const flowRemoveTypesPluginOptions = {
    all: true,
    cache: new Map()
  }

  const sassPluginOptions = {
    cache: false,
    sourceMap: isDevelopment,
    outputStyle: isDevelopment ? 'expanded' : 'compressed',
    loadPaths: [
      resolvePathFromRoot('assets/style')
    ]
  }

  const vuePluginOptions = {
    aliases: {
      ...aliasPluginOptions.entries
    },
    // This map's keys will be relative Vue file paths without leading dot,
    // while its values will be corresponding compiled JS strings.
    cache: new Map(),
    debug: false,
    flowtype: flowRemoveTypesPluginOptions
  }

  const stylelintOptions = {
    cache: true,
    config: require('./package.json').stylelint,
    formatter: 'string',
    syntax: 'scss',
    throwOnError: false,
    throwOnWarning: false
  }

  grunt.initConfig({
    pkg: grunt.file.readJSON('./package.json'),
    checkDependencies: { this: { options: { install: true } } },
    exec: {
      eslint: 'node ./node_modules/eslint/bin/eslint.js --cache "backend/dashboard/**/*.{js,vue}"',
      puglint: '"./node_modules/.bin/pug-lint-vue" backend/dashboard/views',
      stylelint: 'node ./node_modules/stylelint/bin/stylelint.js --cache "backend/dashboard/assets/style/**/*.{css,sass,scss}" "backend/dashboard/views/**/*.vue"',
      strings: './strings.mac ./backend/dashboard --output ./backend/dashboard/assets/strings' // prep translation
    },
    clean: {
      dist: [`${distDir}/*`],
      strings: ['./strings/*']
    },
    copy: {
      indexHtml: {
        src: resolvePathFromRoot('index.html'),
        dest: `${distDir}/index.html`
      },
      assets: {
        cwd: resolvePathFromRoot('assets'),
        src: [
          '**/*',
          '!style/**',
          '!strings/*.strings' // don't need to copy files with .strings extention (only *.json files are used as translation tables in the app)
        ],
        dest: distAssets,
        expand: true
      }
    }
  })

  // -------------------------------------------------------------------------
  //  Grunt Tasks
  // -------------------------------------------------------------------------

  grunt.registerTask('default', ['dev-dashboard'])

  let killKeepAlive = null
  grunt.registerTask('keepalive', function () {
    // This keeps grunt running after other async tasks have completed.
    // eslint-disable-next-line no-unused-vars
    killKeepAlive = this.async()
  })

  grunt.registerTask('dev-dashboard', [
    'checkDependencies',
    'build:watch',
    'backend:relaunch',
    'keepalive'
  ])

  grunt.registerTask('build', function () {
    const isDevBuild = this.flags.watch

    grunt.task.run([
      'clean:dist',
      'exec:eslint',
      !isDevBuild && 'exec:strings',
      'exec:puglint',
      'exec:stylelint',
      'copy:indexHtml',
      'copy:assets',
      isDevBuild ? 'esbuild:watch' : 'esbuild'
    ].filter(Boolean))
  })

  let child = null
  grunt.registerTask('backend:relaunch', '[internal]', function () {
    const done = this.async() // Tell Grunt we're async.
    const fork2 = function () {
      grunt.log.writeln('backend: forking...')
      child = fork(backendIndex, process.argv, {
        env: {
          ...process.env,
          IS_CHELONIA_DASHBOARD_DEV: true
        },
        execArgv: ['--require', '@babel/register']
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
          // ^C can cause c to be null, which is an OK error.
          process.exit(c || 0)
        }
      })
      done()
    }
    if (child) {
      grunt.log.writeln('Killing child!')
      // Wait for successful shutdown to avoid EADDRINUSE errors.
      child.on('message', () => {
        child = null
        fork2()
      })
      child.send({ shutdown: 1 })
    } else {
      fork2()
    }
  })

  grunt.registerTask('esbuild', async function () {
    const done = this.async()
    const { createEsbuildTask } = require('./scripts/esbuild-commands.js')
    const aliasPlugin = require('./scripts/esbuild-plugins/alias-plugin.js')(aliasPluginOptions)
    const flowRemoveTypesPlugin = require('./scripts/esbuild-plugins/flow-remove-types-plugin.js')(flowRemoveTypesPluginOptions)
    const sassPlugin = require('esbuild-sass-plugin').sassPlugin(sassPluginOptions)
    const vuePlugin = require('./scripts/esbuild-plugins/vue-plugin.js')(vuePluginOptions)
    const buildMainJS = createEsbuildTask({
      ...esbuildOptionsBag.default,
      ...esbuildOptionsBag.mainJS,
      plugins: [aliasPlugin, flowRemoveTypesPlugin, sassPlugin, vuePlugin]
    })
    // importing main.scss directly into .js or .vue file requires an additional post-build operation where
    // we have to manually copy the main.css sitting next to main.js to assets/css folder. (refer to esbuildOtherOptionBags.main in Gruntfile.js)
    // That works great but we can avoid this additional task by building & emitting main.css seperately.
    const buildMainCss = createEsbuildTask({
      ...esbuildOptionsBag.default,
      ...esbuildOptionsBag.mainCss,
      plugins: [aliasPlugin, sassPlugin]
    })

    try {
      await buildMainJS.run()
      await buildMainCss.run()
    } catch (err) {
      grunt.log.error(err.message)
      process.exit(1)
    }

    if (!this.flags.watch) {
      return done()
    }

    const browserSync = require('browser-sync').create('dashboard')
    browserSync.init(browserSyncOptions)

    const eslint = require('./scripts/esbuild-plugins/utils.js').createEslinter(eslintOptions)
    const puglint = require('./scripts/esbuild-plugins/utils.js').createPuglinter(puglintOptions)
    const stylelint = require('./scripts/esbuild-plugins/utils.js').createStylelinter(stylelintOptions)
    const { chalkFileEvent, chalkLintingTime } = require('./scripts/esbuild-plugins/utils.js')

    ;[
      [['backend/dashboard/index.html'], ['copy:indexHtml']],
      [['backend/dashboard/assets/{fonts,images}/**/*'], ['copy:assets']],
      // if file changes in dashboard/dist is watched, browser-sync gets into the infinite loop of reloading for some reason.
      [['backend/dashboard/assets/style/**/*.scss'], [stylelint]],
      [['backend/dashboard/**/*.js'], [eslint]],
      [['backend/dashboard/views/**/*.vue'], [puglint, stylelint, eslint]]
    ].forEach(([globs, tasks]) => {
      for (const glob of globs) {
        browserSync.watch(glob, { ignoreInitial: true }, async (fileEventName, filePath) => {
          const extension = path.extname(filePath)
          grunt.log.writeln(chalkFileEvent(fileEventName, filePath))

          if (['add', 'change'].includes(fileEventName)) {
            const code = await readFile(filePath, 'utf8')
            const linters = tasks.filter(task => typeof task === 'object')
            const lintingStartMs = Date.now()

            try {
              await Promise.all(linters.map(linter => linter.lintCode(code, filePath)))
            } catch (e) {
              // Don't crash the Grunt process on lint errors.
            }

            // Log the linting time, formatted with Chalk.
            grunt.log.writeln(chalkLintingTime(Date.now() - lintingStartMs, linters, [filePath]))
          }

          if (['change', 'unlink'].includes(fileEventName)) {
            // Remove the corresponding plugin cache entry, if any.

            if (extension === '.js') {
              flowRemoveTypesPluginOptions.cache.delete(filePath)
            } else if (extension === '.vue') {
              vuePluginOptions.cache.delete(filePath)
            }

            // Clear the whole Vue plugin cache if a Sass or SVG file was
            // changed since some compiled Vue files might include it.
            if (['.sass', '.scss', '.svg'].includes(extension)) {
              vuePluginOptions.cache.clear()
            }
          }

          // Only rebuild the relevant entry point.
          try {
            if (['.scss', '.sass'].includes(extension)) {
              buildMainCss.run({ fileEventName, filePath })
            } else {
              buildMainJS.run({ fileEventName, filePath })
            }
          } catch (err) {
            grunt.log.error(err.message)
          }

          grunt.task.run(tasks.filter(task => typeof task === 'string'))
          grunt.task.run(['keepalive'])

          // Allow the task queue to move forward.
          killKeepAlive && killKeepAlive()
        })
      }
    })
    grunt.log.writeln(chalk`{green browsersync:} setup done!`)
    done()
  })
}
