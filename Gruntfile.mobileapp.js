'use strict'

const util = require('util')
const chalk = require('chalk')
const { exec, execSync } = require('child_process')
const execP = util.promisify(exec)
const { mkdir, access, copyFile, readFile } = require('fs/promises')
const fs = require('fs')
const path = require('path')

const { resolve } = path
const packageJSON = require('./package.json')

const {
  CI = '',
  LIGHTWEIGHT_CLIENT = 'true',
  MAX_EVENTS_AFTER = '',
  NODE_ENV = 'development',
  EXPOSE_SBP = '',
  ENABLE_UNSAFE_NULL_CRYPTO = 'false',
  UNSAFE_TRUST_ALL_MANIFEST_SIGNING_KEYS = 'false'
} = process.env

const CONTRACTS_VERSION = packageJSON.contractsVersion
// In development, append a timestamp so that browsers will detect a new version
// and reload whenever the live server is restarted.
const GI_VERSION = packageJSON.version + (NODE_ENV === 'development' && process.argv[2] === 'dev' ? `@${new Date().toISOString()}` : '')
Object.assign(process.env, { CONTRACTS_VERSION, GI_VERSION })

// file paths
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

// Make database path available to subprocess
const dbPath = process.env.DB_PATH || './data'
if (!process.env.DB_PATH) {
  Object.assign(process.env, { DB_PATH: dbPath })
}

const isValidPort = (port) => {
  return !Number.isNaN(port) && port >= 1024 && port <= 65535
}

module.exports = (grunt) => {
  require('load-grunt-tasks')(grunt)

  const GI_GIT_VERSION = process.env.CI
    ? process.env.GI_VERSION
    : execSync('git describe --dirty').toString('utf8').trim()
  Object.assign(process.env, { GI_GIT_VERSION })

  process.env.MOBILE_APP_API_URL = development
    ? 'https://debug.groupincome.org'
    : 'https://groupincome.app'

  // Helper functions

  function pick (o, props) {
    const x = {}
    for (const k of props) { x[k] = o[k] }
    return x
  }

  function clone (o) {
    return JSON.parse(JSON.stringify(o))
  }

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
    // TODO: do this with JS instead of POSIX commands for Windows support
    const { stdout } = await execWithErrMsg(`ls ${dir}/*-slim.js | sed -En 's/.*\\/(.*)-slim.js/\\1/p' | xargs -I {} node_modules/.bin/chel manifest -n gi.contracts/{} -v ${version} -s ${dir}/{}-slim.js ${keyFile} ${dir}/{}.js`, 'error generating manifests')
    console.log(stdout)
  }

  async function deployAndUpdateMainSrc (manifestDir, dest) {
    grunt.log.writeln(chalk.underline(`Running 'chel deploy' to ${dest}`))
    // If we're writing to a URL, don't try to create a directory
    try {
      const url = new URL(dest)
      // Likely a drive letter
      if (url.protocol.length < 3) {
        throw new Error('Not a URL')
      }
    } catch {
      await access(dest).catch(async () => await mkdir(dest))
    }

    const { stdout } = await execWithErrMsg(`./node_modules/.bin/chel deploy ${dest} ${manifestDir}/*.manifest.json`, 'error deploying contracts')
    console.log(stdout)
    const r = /contracts\/([^.]+)\.(?:x|[\d.]+)\.manifest.*\/(.*)/g
    const manifests = Object.fromEntries(Array.from(stdout.replace(/\\/g, '/').matchAll(r), x => [`gi.contracts/${x[1]}`, x[2]]))
    fs.writeFileSync(manifestJSON, JSON.stringify({ manifests }, null, 2) + '\n', 'utf8')
    console.log(chalk.green('manifest JSON written to:'), manifestJSON, '\n')
  }

  async function genManifestsAndDeploy (dir, version, dest = dbPath) {
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
    // files option - browserSync watches these files and reloads the page when they change.
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

    // Instead of specifying a proxy for the hapi server, watch&serve the `dist` directory directly.
    server: {
      baseDir: 'dist'
    },

    reloadDelay: 100,
    reloadThrottle: 2000,
    tunnel: grunt.option('tunnel') && `gi${crypto.randomBytes(2).toString('hex')}`
  }

  const databaseOptionBags = {
    fs: {
      dest: dbPath
    },
    sqlite: {
      dest: `${dbPath}/groupincome.db`
    }
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
        'process.env.UNSAFE_TRUST_ALL_MANIFEST_SIGNING_KEYS': `'${UNSAFE_TRUST_ALL_MANIFEST_SIGNING_KEYS}'`,
        'process.env.MOBILE_APP_API_URL': `'${process.env.MOBILE_APP_API_URL}'`,
        'process.env.IS_MOBILE_APP': '"true"'
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
      entryPoints: ['./frontend/controller/serviceworkers/sw-primary.js'],
      outdir: distDir // this is `${distDir}/assets/js` in the web-app build(Gruntfile.js)
    }
  }

  // esbuild options for building contracts files
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
      chelDevDeploy: `find contracts -iname "*.manifest.json" | xargs -r ./node_modules/.bin/chel deploy ${dbPath}`,
      chelProdDeploy: `find ${distContracts} -iname "*.manifest.json" | xargs -r ./node_modules/.bin/chel deploy ${dbPath}`
    }
  })

  // -------------------------------------------------------------------------
  //  Grunt Tasks
  // -------------------------------------------------------------------------

  grunt.registerTask('chelDeploy', function () {
    grunt.task.run([production ? 'exec:chelProdDeploy' : 'exec:chelDevDeploy'])
  })

  grunt.registerTask('build', function () {
    const esbuild = this.flags.watch ? 'esbuild:watch' : 'esbuild'

    if (!grunt.option('skipbuild')) {
      grunt.task.run(['exec:eslint', 'exec:flow', 'exec:puglint', 'exec:stylelint', 'clean', 'copy', esbuild])
    }
  })

  grunt.registerTask('default', ['dev'])
  grunt.registerTask('dev', ['exec:gitconfig', 'checkDependencies', 'chelDeploy', 'build:watch', 'keepalive'])

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

    // If there is port override, use it.
    const portOverride = grunt.option('browsersync-port') || process.env.BROWSER_SYNC_PORT
    if (portOverride && isValidPort(portOverride)) {
      browserSyncOptions.port = Number(portOverride)
    }

    browserSync.init(browserSyncOptions)

    ;[
      [['Gruntfile.js'], [eslint]],
      [['shared/**/*.js'], [eslint]],
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
              const dest = databaseOptionBags[process.env.GI_PERSIST]?.dest
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

  // -------------------------------------------------------------------------
  //  Process event handlers
  // -------------------------------------------------------------------------

  process.on('exit', () => {
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
