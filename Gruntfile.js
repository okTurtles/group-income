'use strict'

if (process.env['CI']) process.exit(1)

// =======================
// Entry point.
//
// Ensures:
//
// - Babel support is available on the backend, in Mocha tests, etc.
// - Environment variables are set to different values depending
//   on whether we're in a production environment or otherwise.
//
// =======================

const util = require('util')
const chalk = require('chalk')
const crypto = require('crypto')
const { exec, fork } = require('child_process')
const execP = util.promisify(exec)
const { copyFile, readFile } = require('fs/promises')
const fs = require('fs')
const path = require('path')
const { resolve } = path
const packageJSON = require('./package.json')

// =======================
// Global environment variables setup
//
// - Esbuild's `define` option allows to replace e.g. `process.env.VARIABLE`
// with its corresponding value at build-time, similar to C macros.
//
// See https://esbuild.github.io/api/#define
// =======================

/**
 * Creates a modified copy of the given `process.env` object, according to its `PORT_SHIFT` variable.
 *
 * The `API_PORT` and `API_URL` variables will be updated.
 * TODO: make the protocol (http vs https) variable based on environment var.
 * @param {Object} env
 * @returns {Object}
 */
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

process.env.GI_VERSION = `${packageJSON.version}@${new Date().toISOString()}`

// Not loading babel-register here since it is quite a heavy import and is not always used.
// We will rather load it later, and only if necessary.
// require('@babel/register')

const {
  CI = '',
  LIGHTWEIGHT_CLIENT = 'true',
  GI_VERSION,
  NODE_ENV = 'development',
  EXPOSE_SBP = ''
} = process.env

const backendIndex = './backend/index.js'
const distAssets = 'dist/assets'
const distCSS = 'dist/assets/css'
const distDir = 'dist'
const distContracts = 'dist/contracts'
const distJS = 'dist/assets/js'
const serviceWorkerDir = 'frontend/controller/serviceworkers'
const srcDir = 'frontend'
const contractsDir = 'frontend/model/contracts'
const mainSrc = path.join(srcDir, 'main.js')
const manifestJSON = path.join(contractsDir, 'manifests.json')

const development = NODE_ENV === 'development'
const production = !development

module.exports = (grunt) => {
  require('load-grunt-tasks')(grunt)

  // Helper functions

  function pick (o, props) {
    const x = {}
    for (const k of props) { x[k] = o[k] }
    return x
  }

  const clone = o => JSON.parse(JSON.stringify(o))

  async function execWithErrMsg (cmd, errMsg) {
    const { stdout, stderr } = await execP(cmd, {
      // this is needed to get it to work in certain Windows environments
      shell: process.env.SHELL || '/bin/sh'
    })
    if (stderr) {
      console.error(chalk`{red ${errMsg}:}`, stderr)
      throw new Error(errMsg)
    }
    return { stdout }
  }

  async function generateManifests (dir, version) {
    if (development) {
      grunt.log.writeln(chalk.underline("\nRunning 'chel manifest'"))
      // TODO: do this with JS instead of POSIX commands for Windows support
      const { stdout } = await execWithErrMsg(`ls ${dir}/*-slim.js | sed -En 's/.*\\/(.*)-slim.js/\\1/p' | xargs -I {} node_modules/.bin/chel manifest -v ${version} -s ${dir}/{}-slim.js key.json ${dir}/{}.js`, 'error generating manifests')
      console.log(stdout)
    } else {
      // Only run these in NODE_ENV=development so that production servers
      // don't overwrite manifests.json
      grunt.log.writeln(chalk.yellow("\n(Skipping) Running 'chel manifest'"))
    }
  }

  async function deployAndUpdateMainSrc (manifestDir) {
    if (development) {
      grunt.log.writeln(chalk.underline("Running 'chel deploy'"))
      const { stdout } = await execWithErrMsg(`./node_modules/.bin/chel deploy ./data ${manifestDir}/*.manifest.json`, 'error deploying contracts')
      console.log(stdout)
      const r = /contracts\/([^.]+)\.(?:x|[\d.]+)\.manifest.*data\/(.*)/g
      const manifests = Object.fromEntries(Array.from(stdout.replace(/\\/g, '/').matchAll(r), x => [`gi.contracts/${x[1]}`, x[2]]))
      fs.writeFileSync(manifestJSON,
        JSON.stringify({ manifests }, null, 2) + '\n',
        'utf8')
      console.log(chalk.green('manifest JSON written to:'), manifestJSON, '\n')
    } else {
      // Only run these in NODE_ENV=development so that production servers
      // don't overwrite manifests.json
      grunt.log.writeln(chalk.yellow("\n(Skipping) Running 'chel deploy'"))
    }
  }

  async function genManifestsAndDeploy (dir, version) {
    await generateManifests(dir, version)
    await deployAndUpdateMainSrc(dir)
  }

  // Used by both the alias plugin and the Vue plugin.
  const aliasPluginOptions = {
    entries: {
      '@assets': './frontend/assets',
      '@common': './frontend/common',
      '@components': './frontend/views/components',
      '@containers': './frontend/views/containers',
      '@controller': './frontend/controller',
      '@model': './frontend/model',
      '@pages': './frontend/views/pages',
      '@svgs': './frontend/assets/svgs',
      '@utils': './frontend/utils',
      '@view-utils': './frontend/views/utils',
      '@views': './frontend/views',
      'vue': './node_modules/vue/dist/vue.esm.js',
      '~': '.'
    }
  }

  // https://browsersync.io/docs/options
  const browserSyncOptions = {
    cors: true,
    files: [
      // Glob matching uses https://github.com/micromatch/picomatch
      `${distJS}/main.js`,
      `${distDir}/index.html`,
      `${distAssets}/**/*`,
      `${distCSS}/**/*`
    ],
    ghostMode: false,
    logLevel: grunt.option('debug') ? 'debug' : 'info',
    open: false,
    port: 3000,
    proxy: {
      target: process.env.API_URL,
      ws: true
    },
    reloadDelay: 100,
    reloadThrottle: 2000,
    tunnel: grunt.option('tunnel') && `gi${crypto.randomBytes(2).toString('hex')}`
  }

  // https://esbuild.github.io/api/
  const esbuildOptionBags = {
    // Native options that are shared between our esbuild tasks.
    default: {
      bundle: true,
      chunkNames: '[name]-[hash]-cached',
      define: {
        'process.env.BUILD': "'web'", // Required by Vuelidate.
        'process.env.CI': `'${CI}'`,
        'process.env.GI_VERSION': `'${GI_VERSION}'`,
        'process.env.LIGHTWEIGHT_CLIENT': `'${LIGHTWEIGHT_CLIENT}'`,
        'process.env.NODE_ENV': `'${NODE_ENV}'`,
        'process.env.EXPOSE_SBP': `'${EXPOSE_SBP}'`
      },
      external: ['crypto', '*.eot', '*.ttf', '*.woff', '*.woff2'],
      format: 'esm',
      incremental: true,
      loader: {
        '.eot': 'file',
        '.ttf': 'file',
        '.woff': 'file',
        '.woff2': 'file'
      },
      minifyIdentifiers: production,
      minifySyntax: production,
      minifyWhitespace: production,
      outdir: distJS,
      sourcemap: development,
      // Warning: split mode has still a few issues. See https://github.com/okTurtles/group-income/pull/1196
      splitting: !grunt.option('no-chunks'),
      watch: false // Not using esbuild's own watch mode since it involves polling.
    },
    // Native options used when building the main entry point.
    main: {
      assetNames: '../css/[name]',
      entryPoints: [mainSrc]
    },
    // Native options used when building our service worker(s).
    serviceWorkers: {
      entryPoints: ['./frontend/controller/serviceworkers/primary.js']
    }
  }
  esbuildOptionBags.contracts = {
    ...pick(clone(esbuildOptionBags.default), [
      'define', 'bundle', 'watch', 'incremental'
    ]),
    // format: 'esm',
    format: 'iife',
    // banner: {
    //   js: 'import { createRequire as topLevelCreateRequire } from "module"\nconst require = topLevelCreateRequire(import.meta.url)'
    // },
    splitting: false,
    outdir: distContracts,
    entryPoints: [`${contractsDir}/group.js`, `${contractsDir}/chatroom.js`, `${contractsDir}/identity.js`, `${contractsDir}/mailbox.js`],
    external: ['@sbp/sbp']
  }
  // prevent contract hash from changing each time we build them
  esbuildOptionBags.contracts.define['process.env.GI_VERSION'] = "'x.x.x'"
  esbuildOptionBags.contractsSlim = clone(esbuildOptionBags.contracts)
  esbuildOptionBags.contractsSlim.entryNames = '[name]-slim'
  esbuildOptionBags.contractsSlim.external = ['@common/common.js', '@sbp/sbp']

  // Additional options which are not part of the esbuild API.
  const esbuildOtherOptionBags = {
    main: {
      // Our `index.html` file is designed to load its CSS from `dist/assets/css`;
      // however, esbuild outputs `main.css` and `main.css.map` along `main.js`,
      // making a post-build copying operation necessary.
      postoperation: async ({ fileEventName, filePath } = {}) => {
        // Only after a fresh build or a rebuild caused by a CSS file event.
        if (!fileEventName || ['.css', '.sass', '.scss'].includes(path.extname(filePath))) {
          await copyFile(`${distJS}/main.css`, `${distCSS}/main.css`)
          if (development) {
            await copyFile(`${distJS}/main.css.map`, `${distCSS}/main.css.map`)
          }
        }
      }
    }
  }

  // https://github.com/rollup/plugins/tree/master/packages/eslint#options
  const eslintOptions = {
    format: 'stylish',
    throwOnError: false,
    throwOnWarning: false
  }

  // By default, `flow-remove-types` doesn't process files which don't start with a `@flow` annotation,
  // so we have to pass the `all` option since we don't use `@flow` annotations.
  const flowRemoveTypesPluginOptions = {
    all: true,
    cache: new Map()
  }

  const puglintOptions = {}

  // https://github.com/sass/dart-sass#javascript-api
  const sassPluginOptions = {
    cache: false, // Enabling it causes an error: "Cannot read property 'resolveDir' of undefined".
    sourceMap: development, // This option has currently no effect.
    outputStyle: development ? 'expanded' : 'compressed',
    loadPaths: [
      resolve('./node_modules'), // So we can write `@import 'vue-slider-component/lib/theme/default.scss';` in .vue <style>.
      resolve('./frontend/assets/style') // So we can write `@import '_variables.scss';` in .vue <style> section.
    ],
    // This option has currently no effect, so I had to add at-import path aliasing in the Vue plugin.
    importer (url, previous, done) {
      // So we can write `@import '@assets/style/_variables.scss'` in the <style> section of .vue components too.
      return url.startsWith('@assets/')
        ? { file: resolve('./frontend/assets', url.slice('@assets/'.length)) }
        : null
    }
  }

  // https://github.com/stylelint/stylelint/blob/master/docs/user-guide/usage/node-api.md#options
  const stylelintOptions = {
    cache: true,
    config: require('./package.json').stylelint,
    formatter: 'string',
    syntax: 'scss',
    throwOnError: false,
    throwOnWarning: false
  }

  const svgInlineVuePluginOptions = {
    // This map's keys will be relative SVG file paths without leading dot,
    // while its values will be corresponding compiled JS strings.
    cache: new Map(),
    debug: false
  }

  const vuePluginOptions = {
    aliases: {
      ...aliasPluginOptions.entries,
      // So we can write @import 'vue-slider-component/lib/theme/default.scss'; in .vue <style>.
      'vue-slider-component': './node_modules/vue-slider-component'
    },
    // This map's keys will be relative Vue file paths without leading dot,
    // while its values will be corresponding compiled JS strings.
    cache: new Map(),
    debug: false,
    flowtype: flowRemoveTypesPluginOptions
  }

  // Helper functions

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    checkDependencies: { this: { options: { install: true } } },

    clean: { dist: [`${distDir}/*`] },

    copy: {
      html_files: {
        src: 'frontend/index.html',
        dest: `${distDir}/index.html`
      },
      assets: {
        cwd: 'frontend/assets',
        src: ['**/*', '!style/**', '!svgs/**'],
        dest: distAssets,
        expand: true
      },
      strings: {
        src: ['strings/*.json'],
        dest: distAssets,
        expand: true
      }
    },

    exec: {
      eslint: 'node ./node_modules/eslint/bin/eslint.js --cache "**/*.{js,vue}"',
      flow: '"./node_modules/.bin/flow" --quiet || echo The Flow check failed!',
      puglint: '"./node_modules/.bin/pug-lint-vue" frontend/views',
      stylelint: 'node ./node_modules/stylelint/bin/stylelint.js --cache "frontend/assets/style/**/*.{css,sass,scss}" "frontend/views/**/*.vue"',
      // Test files:
      // - anything in the `/test` folder, e.g. integration tests;
      // - anything that ends with `.test.js`, e.g. unit tests for SBP domains kept in the domain folder.
      // The `--require` flag ensures custom Babel support in our test files.
      test: {
        cmd: 'node --experimental-fetch node_modules/mocha/bin/mocha --require ./scripts/mocha-helper.js --exit -R spec --bail "./{test/,!(node_modules|ignored|dist|historical|test)/**/}*.test.js"',
        options: { env: process.env }
      },
      chelDeployAll: 'find contracts -iname "*.manifest.json" | xargs -r ./node_modules/.bin/chel deploy ./data'
    }
  })

  // -------------------------------------------------------------------------
  //  Grunt Tasks
  // -------------------------------------------------------------------------

  let child = null

  // Useful helper task for `grunt test`.
  grunt.registerTask('backend:launch', '[internal]', function () {
    const done = this.async()
    grunt.log.writeln('backend: launching...')
    // Provides Babel support for the backend files.
    require('@babel/register')
    require(backendIndex).then(done).catch(done)
  })

  // Used with `grunt dev` only, makes it possible to restart just the server when
  // backend or shared files are modified.
  grunt.registerTask('backend:relaunch', '[internal]', function () {
    const done = this.async() // Tell Grunt we're async.
    const fork2 = function () {
      grunt.log.writeln('backend: forking...')
      child = fork(backendIndex, process.argv, {
        env: process.env,
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

  grunt.registerTask('build', function () {
    const esbuild = this.flags.watch ? 'esbuild:watch' : 'esbuild'

    if (!grunt.option('skipbuild')) {
      grunt.task.run(['exec:eslint', 'exec:flow', 'exec:puglint', 'exec:stylelint', 'clean', 'copy', esbuild])
    }
  })

  grunt.registerTask('cypress', function () {
    const cypress = require('cypress')
    const done = this.async()
    const command = grunt.option('browser') === 'debug' ? 'open' : 'run'

    // https://docs.cypress.io/guides/guides/module-api.html
    const options = {
      run: {
        headed: grunt.option('browser') === true,
        ...(process.env.CYPRESS_RECORD_KEY && {
          record: true,
          key: process.env.CYPRESS_RECORD_KEY
        })
      },
      open: {
        // add cypress.open() options here
      }
    }[command]
    grunt.log.writeln(`cypress: running in "${command}" mode...`)
    cypress[command](options).then(r => done(r.totalFailed === 0)).catch(done)
  })

  grunt.registerTask('_pin', async function (version) {
    // a task internally executed in 'pin' task below
    const done = this.async()
    const dirPath = `contracts/${version}`

    if (fs.existsSync(dirPath)) {
      if (grunt.option('overwrite')) { // if the task is run with '--overwrite' option, empty the folder first.
        fs.rmSync(dirPath, { recursive: true })
      } else {
        throw new Error(`already exists: ${dirPath}`)
      }
    }
    // since the copied manifest files might not have the correct version on them
    // we need to delete the old ones and regenerate them
    await execWithErrMsg(`rm -f ${distContracts}/*.manifest.json`)
    await genManifestsAndDeploy(distContracts, version)
    await execWithErrMsg(`cp -r ${distContracts} ${dirPath}`, 'error copying contracts')
    console.log(chalk`{green Version} {bold ${version}} {green pinned to:} ${dirPath}`)
    // it's possible for the UI to get updated without the contracts getting updated,
    // so we keep their version numbers separate.
    packageJSON.contractsVersion = version
    fs.writeFileSync('package.json', JSON.stringify(packageJSON, null, 2) + '\n', 'utf8')
    console.log(chalk.green('updated package.json "contractsVersion" to:'), version)
    done()
  })

  grunt.registerTask('pin', function (version) {
    if (typeof version !== 'string') throw new Error('usage: grunt pin:<version>')

    grunt.task.run('build')
    grunt.task.run(`_pin:${version}`)
  })

  grunt.registerTask('default', ['dev'])
  // TODO: add 'deploy' as per https://github.com/okTurtles/group-income/issues/10
  grunt.registerTask('dev', ['checkDependencies', 'exec:chelDeployAll', 'build:watch', 'backend:relaunch', 'keepalive'])
  grunt.registerTask('dist', ['build'])

  // --------------------
  // - Our esbuild task
  // --------------------

  grunt.registerTask('esbuild', async function () {
    const done = this.async()
    const createAliasPlugin = require('./scripts/esbuild-plugins/alias-plugin.js')
    const aliasPlugin = createAliasPlugin(aliasPluginOptions)
    const flowRemoveTypesPlugin = require('./scripts/esbuild-plugins/flow-remove-types-plugin.js')(flowRemoveTypesPluginOptions)
    const sassPlugin = require('esbuild-sass-plugin').sassPlugin(sassPluginOptions)
    const svgPlugin = require('./scripts/esbuild-plugins/vue-inline-svg-plugin.js')(svgInlineVuePluginOptions)
    const vuePlugin = require('./scripts/esbuild-plugins/vue-plugin.js')(vuePluginOptions)
    const { createEsbuildTask } = require('./scripts/esbuild-commands.js')
    const defaultPlugins = [aliasPlugin, flowRemoveTypesPlugin]

    const buildMain = createEsbuildTask({
      ...esbuildOptionBags.default,
      ...esbuildOptionBags.main,
      plugins: [...defaultPlugins, sassPlugin, svgPlugin, vuePlugin]
    }, esbuildOtherOptionBags.main)

    const buildServiceWorkers = createEsbuildTask({
      ...esbuildOptionBags.default,
      ...esbuildOptionBags.serviceWorkers,
      plugins: defaultPlugins
    })
    const buildContracts = createEsbuildTask({
      ...esbuildOptionBags.contracts, plugins: defaultPlugins
    })
    const buildContractsSlim = createEsbuildTask({
      ...esbuildOptionBags.contractsSlim, plugins: defaultPlugins
    })

    // first we build the contracts since genManifestsAndDeploy depends on that
    // and then we build the main bundle since it depends on manifests.json
    await Promise.all([buildContracts.run(), buildContractsSlim.run()])
      .then(() => {
        return genManifestsAndDeploy(distContracts, packageJSON.contractsVersion)
      })
      .then(() => {
        return Promise.all([buildMain.run(), buildServiceWorkers.run()])
      })
      .catch(error => {
        grunt.log.error(error.message)
        process.exit(1)
      })

    if (!this.flags.watch) {
      return done()
    }
    const eslint = require('./scripts/esbuild-plugins/utils.js').createEslinter(eslintOptions)
    const puglint = require('./scripts/esbuild-plugins/utils.js').createPuglinter(puglintOptions)
    const stylelint = require('./scripts/esbuild-plugins/utils.js').createStylelinter(stylelintOptions)
    const { chalkFileEvent, chalkLintingTime } = require('./scripts/esbuild-plugins/utils.js')

    // BrowserSync setup.
    const browserSync = require('browser-sync').create('esbuild')
    browserSync.init(browserSyncOptions)

    ;[
      [['Gruntfile.js'], [eslint]],
      [['backend/**/*.js', 'shared/**/*.js'], [eslint, 'backend:relaunch']],
      [['frontend/**/*.html'], ['copy']],
      [['frontend/**/*.js'], [eslint]],
      [['frontend/assets/{fonts,images}/**/*'], ['copy']],
      [['frontend/assets/style/**/*.scss'], [stylelint]],
      [['frontend/assets/svgs/**/*.svg'], []],
      [['frontend/views/**/*.vue'], [puglint, stylelint, eslint]]
    ].forEach(([globs, tasks]) => {
      globs.forEach(glob => {
        browserSync.watch(glob, { ignoreInitial: true }, async (fileEventName, filePath) => {
          const extension = path.extname(filePath)
          grunt.log.writeln(chalkFileEvent(fileEventName, filePath))

          if (fileEventName === 'add' || fileEventName === 'change') {
            // Read and lint the changed file.
            const code = await readFile(filePath, 'utf8')
            const linters = tasks.filter(task => typeof task === 'object')
            const lintingStartMs = Date.now()

            await Promise.all(linters.map(linter => linter.lintCode(code, filePath)))
              // Don't crash the Grunt process on lint errors.
              .catch(() => {})

            // Log the linting time, formatted with Chalk.
            grunt.log.writeln(chalkLintingTime(Date.now() - lintingStartMs, linters, [filePath]))
          }

          if (fileEventName === 'change' || fileEventName === 'unlink') {
            // Remove the corresponding plugin cache entry, if any.
            if (extension === '.js') {
              flowRemoveTypesPluginOptions.cache.delete(filePath)
            } else if (extension === '.svg') {
              svgInlineVuePluginOptions.cache.delete(filePath)
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
            if (filePath.startsWith(serviceWorkerDir)) {
              await buildServiceWorkers.run({ fileEventName, filePath })
            } else if (filePath.startsWith(contractsDir)) {
              await buildContracts.run({ fileEventName, filePath })
              await buildContractsSlim.run({ fileEventName, filePath })
              await genManifestsAndDeploy(distContracts, packageJSON.contractsVersion)
              // genManifestsAndDeploy modifies manifests.json, which means we need
              // to regenerate the main bundle since it imports that file
              await buildMain.run({ fileEventName, filePath })
            } else if (/^(frontend|shared)[/\\]/.test(filePath)) {
              await buildMain.run({ fileEventName, filePath })
            } else {
              grunt.log.error('no builder defined for path:', filePath)
            }
          } catch (error) {
            grunt.log.error(error.message)
          }
          grunt.task.run(tasks.filter(task => typeof task === 'string'))
          grunt.task.run(['keepalive'])

          // Allow the task queue to move forward.
          killKeepAlive && killKeepAlive()
        })
      })
    })
    grunt.log.writeln(chalk`{green browsersync:} setup done!`)
    done()
  })

  // eslint-disable-next-line no-unused-vars
  let killKeepAlive = null
  grunt.registerTask('keepalive', function () {
    // This keeps grunt running after other async tasks have completed.
    // eslint-disable-next-line no-unused-vars
    killKeepAlive = this.async()
  })

  grunt.registerTask('test', ['build', 'exec:chelDeployAll', 'backend:launch', 'exec:test', 'cypress'])
  grunt.registerTask('test:unit', ['backend:launch', 'exec:test'])

  // -------------------------------------------------------------------------
  //  Process event handlers
  // -------------------------------------------------------------------------

  process.on('exit', () => {
    // Note: 'beforeExit' doesn't work.
    // In cases where 'watch' fails while child (server) is still running
    // we will exit and child will continue running in the background.
    // This can happen, for example, when running two GIS instances via
    // the PORT_SHIFT envar. If grunt-contrib-watch livereload process
    // cannot bind to the port for some reason, then the parent process
    // will exit leaving a dangling child server process.
    if (child) {
      grunt.log.writeln('Quitting dangling child!')
      child.send({ shutdown: 2 })
    }
    // Stops the Flowtype server.
    exec('./node_modules/.bin/flow stop')
  })

  process.on('uncaughtException', (err) => {
    console.error('[gruntfile] Unhandled exception:', err, err.stack)
    process.exit(1)
  })

  process.on('unhandledRejection', (reason, p) => {
    console.error('[gruntfile] Unhandled promise rejection:', p, 'reason:', reason)
    process.exit(1)
  })
}
