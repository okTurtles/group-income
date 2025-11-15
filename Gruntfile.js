'use strict'

// TODO: REMOVEME. This prevents tests from running
// if (process.env['CI']) process.exit(1)

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
const { exec, execSync } = require('child_process')
const execP = util.promisify(exec)
const { readdir, cp, mkdir, rm, copyFile, readFile } = require('fs/promises')
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

// Not loading babel-register here since it is quite a heavy import and is not always used.
// We will rather load it later, and only if necessary.
// require('@babel/register')

const {
  CI = '',
  LIGHTWEIGHT_CLIENT = 'true',
  MAX_EVENTS_AFTER = '',
  NODE_ENV = 'development',
  EXPOSE_SBP = '',
  ENABLE_UNSAFE_NULL_CRYPTO = 'false',
  UNSAFE_TRUST_ALL_MANIFEST_SIGNING_KEYS = 'false'
} = process.env

if (!['development', 'production'].includes(NODE_ENV)) {
  throw new TypeError(`Invalid NODE_ENV value: ${NODE_ENV}.`)
}
// 'grunt pin' can override this
let CONTRACTS_VERSION = packageJSON.contractsVersion
// In development, append a timestamp so that browsers will detect a new version
// and reload whenever the live server is restarted.
const GI_VERSION = packageJSON.version + (NODE_ENV === 'development' && process.argv[2] === 'dev' ? `@${new Date().toISOString()}` : '')

// Make version info available to subprocesses.
Object.assign(process.env, { CONTRACTS_VERSION, GI_VERSION })

const distDir = 'dist'
const distAssets = `${distDir}/assets`
const distCSS = `${distDir}/assets/css`
const distContracts = `${distDir}/contracts`
const distJS = `${distDir}/assets/js`
const srcDir = 'frontend'
const serviceWorkerDir = `${srcDir}/controller/serviceworkers`
const contractsDir = `${srcDir}/model/contracts`
const mainSrc = path.join(srcDir, 'main.js')
const manifestJSON = path.join(contractsDir, 'manifests.json')

const development = NODE_ENV === 'development'
const production = !development

module.exports = (grunt) => {
  require('load-grunt-tasks')(grunt)

  const GI_GIT_VERSION = process.env.CI ? process.env.GI_VERSION : execSync('git describe --dirty').toString('utf8').trim()
  Object.assign(process.env, { GI_GIT_VERSION })

  // Ensure API_PORT and API_URL envars are defined and available to subprocesses.
  ;(function defineApiEnvars () {
    const API_PORT = Number.parseInt(grunt.option('port') ?? process.env.API_PORT ?? '8000', 10)

    if (Number.isNaN(API_PORT) || API_PORT < 1024 || API_PORT > 65535) {
      throw new RangeError(`Invalid API_PORT value: ${API_PORT}.`)
    }
    process.env.API_PORT = String(API_PORT)
    process.env.API_URL = 'http://127.0.0.1:' + API_PORT
  })()

  // Helper functions

  function pick (o, props) {
    const x = {}
    for (const k of props) { x[k] = o[k] }
    return x
  }

  const clone = o => JSON.parse(JSON.stringify(o))

  async function execWithErrMsg (cmd, errMsg) {
    const p = execP(cmd, {
      // this is needed to get it to work in certain Windows environments
      shell: process.env.SHELL || '/bin/sh'
    })
    const { stdout, stderr } = await p
    if (p.child.exitCode !== 0) {
      console.error(chalk`{red ${errMsg}:}`, stderr)
      throw new Error(errMsg)
    }
    return { stdout }
  }

  async function generateManifests (dir, version) {
    const keyFile = process.env.KEY_FILE || 'key.json'
    const pubKeyFile = process.env.PUB_KEY_FILE || 'key.pub.json'
    if (fs.existsSync(keyFile)) {
      grunt.log.writeln(chalk.underline(`Key file ${keyFile} exists, using that.`))
    } else {
      grunt.log.writeln(chalk.underline(`\nRunning 'chel keygen --pubout ${pubKeyFile} --out ${keyFile}'`))
      const { stdout } = await execWithErrMsg(`./node_modules/.bin/chel keygen --pubout ${pubKeyFile} --out ${keyFile}`)
      console.log(stdout)
    }
    grunt.log.writeln(chalk.underline("\nRunning 'chel manifest'"))
    grunt.log.writeln(`ls ${dir}/*-slim.js | sed -En 's/.*\\/(.*)-slim.js/\\1/p' | xargs -I {} node_modules/.bin/chel manifest -n gi.contracts/{} -v ${version} -s ${dir}/{}-slim.js ${keyFile} ${dir}/{}.js`)
    // TODO: do this with JS instead of POSIX commands for Windows support
    const { stdout } = await execWithErrMsg(`ls ${dir}/*-slim.js | sed -En 's/.*\\/(.*)-slim.js/\\1/p' | xargs -I {} node_modules/.bin/chel manifest -n gi.contracts/{} -v ${version} -s ${dir}/{}-slim.js ${keyFile} ${dir}/{}.js`, 'error generating manifests')
    console.log(stdout)
  }

  async function deployAndUpdateMainSrc (manifestDir, dest) {
    grunt.log.writeln(chalk.underline("Running 'chel deploy'"))
    const { stdout } = await execWithErrMsg(`./node_modules/.bin/chel deploy ${dest ? `--url ${dest}` : ''} ${manifestDir}/*.manifest.json`, 'error deploying contracts')
    console.log(stdout)
    const r = /contracts\/([^.]+)\.(?:x|[\d.]+)\.manifest.*\/(.*)/g
    const manifests = Object.fromEntries(Array.from(stdout.replace(/\\/g, '/').matchAll(r), x => [`gi.contracts/${x[1]}`, x[2]]))
    fs.writeFileSync(manifestJSON, JSON.stringify({ manifests }, null, 2) + '\n', 'utf8')
    console.log(chalk.green('manifest JSON written to:'), manifestJSON, '\n')
  }

  async function genManifestsAndDeploy (dir, version, dest) {
    await generateManifests(dir, version)
    await deployAndUpdateMainSrc(dir, dest)
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
        'process.env.CONTRACTS_VERSION': `'${CONTRACTS_VERSION}'`,
        'process.env.GI_VERSION': `'${GI_VERSION}'`,
        'process.env.GI_GIT_VERSION': `'${GI_GIT_VERSION}'`,
        'process.env.LIGHTWEIGHT_CLIENT': `'${LIGHTWEIGHT_CLIENT}'`,
        'process.env.MAX_EVENTS_AFTER': `'${MAX_EVENTS_AFTER}'`,
        'process.env.NODE_ENV': `'${NODE_ENV}'`,
        'process.env.EXPOSE_SBP': `'${EXPOSE_SBP}'`,
        'process.env.ENABLE_UNSAFE_NULL_CRYPTO': `'${ENABLE_UNSAFE_NULL_CRYPTO}'`,
        'process.env.UNSAFE_TRUST_ALL_MANIFEST_SIGNING_KEYS': `'${UNSAFE_TRUST_ALL_MANIFEST_SIGNING_KEYS}'`
      },
      external: ['crypto', '*.eot', '*.ttf', '*.woff', '*.woff2'],
      format: 'esm',
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
      sourcemap: true,
      // Warning: split mode has still a few issues. See https://github.com/okTurtles/group-income/pull/1196
      splitting: !grunt.option('no-chunks')
    },
    // Native options used when building the main entry point.
    main: {
      assetNames: '../css/[name]',
      entryPoints: [mainSrc]
    },
    // Native options used when building our service worker(s).
    serviceWorkers: {
      entryPoints: ['./frontend/controller/serviceworkers/sw-primary.js']
    }
  }
  esbuildOptionBags.contracts = {
    ...pick(clone(esbuildOptionBags.default), [
      'define', 'bundle'
    ]),
    // Format must be 'iife' because we don't want 'import' in the output
    format: 'iife',
    // banner: {
    //   js: 'import { createRequire as topLevelCreateRequire } from "module"\nconst require = topLevelCreateRequire(import.meta.url)'
    // },
    splitting: false,
    outdir: distContracts,
    entryPoints: [`${contractsDir}/group.js`, `${contractsDir}/chatroom.js`, `${contractsDir}/identity.js`],
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
      htmlFiles: {
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
      flow: '"./node_modules/.bin/flow" --quiet',
      gitconfig: 'git config --local include.path ../.gitconfig',
      puglint: '"./node_modules/.bin/pug-lint-vue" frontend/views',
      stylelint: 'node ./node_modules/stylelint/bin/stylelint.js --cache "frontend/assets/style/**/*.{css,sass,scss}" "frontend/views/**/*.vue"',
      // Test files:
      // - anything in the `/test` folder, e.g. integration tests;
      // - anything that ends with `.test.js`, e.g. unit tests for SBP domains kept in the domain folder.
      // The `--require` flag ensures custom Babel support in our test files.
      test: {
        cmd: 'node node_modules/mocha/bin/mocha --require ./scripts/mocha-helper.js --exit -R spec --bail "./{test/,!(node_modules|ignored|dist|historical|test)/**/}*.test.js"',
        options: { env: { SKIP_DB_FS_CASE_SENSITIVITY_CHECK: 'true', ...process.env } }
      },
      chelDevDeploy: 'find contracts -iname "*.manifest.json" | xargs -r ./node_modules/.bin/chel deploy',
      chelProdDeploy: `find ${distContracts} -iname "*.manifest.json" | xargs -r ./node_modules/.bin/chel deploy`
    }
  })

  // -------------------------------------------------------------------------
  //  Grunt Tasks
  // -------------------------------------------------------------------------

  grunt.registerTask('copyAndMoveContracts', async function () {
    const done = this.async()
    const { contractsVersion } = packageJSON

    // NOTE: the latest version
    await mkdir(`${distContracts}/${contractsVersion}`)
    for (const dirent of await readdir(distContracts, { withFileTypes: true })) {
      if (dirent.isFile()) {
        const fileName = dirent.name
        await copyFile(`${distContracts}/${fileName}`, `${distContracts}/${contractsVersion}/${fileName}`)
        await rm(`${distContracts}/${fileName}`)
      }
    }

    // NOTE: all previously pinned versions
    const versions = (await readdir('contracts', { withFileTypes: true })).filter(dirent => {
      return dirent.isDirectory() && dirent.name !== contractsVersion
    }).map(dirent => dirent.name)
    for (const version of versions) {
      await cp(`contracts/${version}`, `${distContracts}/${version}`, { recursive: true })
    }

    done()
  })

  grunt.registerTask('chelDeploy', function () {
    grunt.task.run([production ? 'exec:chelProdDeploy' : 'exec:chelDevDeploy'])
  })

  // Used with `grunt dev` only, makes it possible to restart just the server when
  // backend or shared files are modified.
  grunt.registerTask('backend:launch', '[internal]', function () {
    const done = this.async() // Tell Grunt we're async.
    grunt.log.writeln('backend: forking...')
    grunt.log.writeln(chalk.underline('\nRunning \'chel serve\''))
    execWithErrMsg('./node_modules/.bin/chel serve .').then(done)
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
    cypress[command]({
      config: { baseUrl: process.env.API_URL },
      // Exclude some spec files for CI runs
      // group-large|group-proposals are excluded because they take
      // comparatively long
      ...process.env.CI && { spec: 'test/cypress/integration/!(group-large|group-proposals).spec.js' },
      ...options
    })
      .then(r => done(r.totalFailed === 0)).catch(done)
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
    if (!fs.existsSync('contracts')) {
      console.error(chalk`{red folder needed but doesn't exist:} {bold contracts/}`)
      throw new Error("doesn't exist: contracts/")
    }
    await execWithErrMsg(`cp -r ${distContracts} ${dirPath}`, 'error copying contracts')
    console.log(chalk`{green Version} {bold ${version}} {green pinned to:} ${dirPath}`)
    done()
  })

  grunt.registerTask('pin', function (version) {
    if (typeof version !== 'string') throw new Error('usage: grunt pin:<version>')
    // it's possible for the UI to get updated without the contracts getting updated,
    // so we keep their version numbers separate.
    // we do this here first so that any code that uses `process.env.CONTRACTS_VERSION` inside the contracts
    // themselves will be built using this latest version number, and so that the contract manifests
    // are generated using this version number
    packageJSON.contractsVersion = CONTRACTS_VERSION = process.env.CONTRACTS_VERSION = version
    fs.writeFileSync('package.json', JSON.stringify(packageJSON, null, 2) + '\n', 'utf8')
    console.log(chalk.green('updated package.json "contractsVersion" to:'), packageJSON.contractsVersion)
    // note: there is no way to catch exceptions thrown by grunt.task.run, not even by
    // registering handlers for 'unhandledRejection' or 'uncaughtException'
    grunt.task.run(['build', `_pin:${version}`])
  })

  grunt.registerTask('deploy', function () {
    if (!production) {
      grunt.log.warn(chalk.bold.yellow('⚠️  You should probably run with NODE_ENV=production'))
    }
    grunt.task.run(['checkDependencies', 'build', 'copyAndMoveContracts'])
  })
  grunt.registerTask('serve', function () {
    if (!production) {
      grunt.log.warn(chalk.bold.yellow('⚠️  You should probably run with NODE_ENV=production'))
    }
    // NOTE: here we want to call 'exec:chelProdDeploy', not 'chelDeploy', so that the frontend
    // contract manifests match the ones that are the dist archive. We do this in both production
    // and development environments to make sure they match when serving the site using grunt serve.
    grunt.task.run(['exec:chelProdDeploy', 'backend:launch', 'keepalive'])
  })

  grunt.registerTask('default', ['dev'])
  grunt.registerTask('dev', ['exec:gitconfig', 'checkDependencies', 'chelDeploy', 'build:watch', 'backend:launch', 'keepalive'])

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
      .then(() => genManifestsAndDeploy(distContracts, packageJSON.contractsVersion))
      .then(() => Promise.all([buildMain.run(), buildServiceWorkers.run()]))
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
              const dest = process.env.API_URL
              await genManifestsAndDeploy(distContracts, packageJSON.contractsVersion, dest)
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

  grunt.registerTask('test', ['build', 'chelDeploy', 'backend:launch', 'exec:test', 'cypress'])
  grunt.registerTask('test:unit', ['backend:launch', 'exec:test'])
  grunt.registerTask('test:cypress', ['build', 'chelDeploy', 'backend:launch', 'cypress'])

  // -------------------------------------------------------------------------
  //  Process event handlers
  // -------------------------------------------------------------------------

  process.on('exit', () => {
    // Note: 'beforeExit' doesn't work.
    // Stops the Flowtype server.
    exec('./node_modules/.bin/flow stop')
  })

  process.on('uncaughtException', (err) => {
    console.error('[gruntfile] Unhandled exception:', err, err.stack)
    process.exit(1)
  })

  process.on('unhandledRejection', (reason, p) => {
    console.error('[gruntfile] Unhandled promise rejection:', p, 'reason:', reason.message, reason.stack)
    process.exit(1)
  })
}
