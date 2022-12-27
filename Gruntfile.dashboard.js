'use strict'

// ========================================
// A Gruntfile.js for chelonia-dashboard front-end
// ========================================

const path = require('path')
const crypto = require('crypto')
const { copyFile } = require('fs/promises')
const { NODE_ENV = 'development' } = process.env

// paths
const dashboardRootDir = path.resolve(__dirname, 'backend/dashboard')
const resolvePathFromRoot = relPath => path.join(dashboardRootDir, relPath)
const distDir = resolvePathFromRoot('dist')
const distAssets = path.join(distDir, 'assets')
const distCSS = path.join(distDir, 'assets/css')
const distJS = path.join(distDir, 'assets/js')
const mainSrc = resolvePathFromRoot('main.js')
const mainScss = resolvePathFromRoot('assets/style/main.scss')

const isDevelopment = NODE_ENV === 'development'
const isProduction = !isDevelopment

module.exports = (grunt) => {
  require('load-grunt-tasks')(grunt)

  const esbuildOptionsBag = {
    default: {
      bundle: true,
      incremental: true,
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
      watch: false,
      chunkNames: '[name]-[hash]-cached'
    },
    mainJS: {
      entryPoints: [mainSrc],
      outdir: distJS,
      define: {
        'process.env.NODE_ENV': `'${NODE_ENV}'`
      },
      external: ['*.eot', '*.ttf', '*woff', '*.woff2'],
      splitting: !grunt.option('no-chunks'),
      format: 'esm'
    },
    mainCss: {
      entryPoints: [mainScss],
      outfile: path.join(distCSS, 'main.css')
    }
  }
  const esbuildOptions = {
    bundle: true,
    entryPoints: [mainSrc],
    outdir: distJS,
    define: {
      'process.env.NODE_ENV': `'${NODE_ENV}'`
    },
    external: ['*.eot', '*.ttf', '*woff', '*.woff2'],
    format: 'esm',
    incremental: true,
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
    watch: false,
    splitting: !grunt.option('no-chunks'),
    chunkNames: '[name]-[hash]-cached'
  }

  // Used by both the alias plugin and the Vue plugin.
  const aliasPluginOptions = {
    entries: {
      '@assets': './backend/dashboard/assets',
      '@views': './backend/dashboard/views',
      '@components': './backend/dashboard/views/components',
      'vue': './node_modules/vue/dist/vue.esm.js',
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
    ghostMode: false,
    logLevel: 'info',
    open: true,
    port: 3000,
    server: distDir,
    reloadDelay: 100,
    reloadThrottle: 2000,
    tunnel: grunt.option('tunnel') && `gi${crypto.randomBytes(2).toString('hex')}`
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
      ...aliasPluginOptions.entries,
      // So we can write @import 'vue-slider-component/lib/theme/default.scss'; in .vue <style>.
      'vue-slider-component': './node_modules/vue-slider-component'
    },
    // This map's keys will be relative Vue file paths without leading dot,
    // while its values will be corresponding compiled JS strings.
    cache: new Map(),
    debug: false
  }

  grunt.initConfig({
    pkg: grunt.file.readJSON('./package.json'),
    checkDependencies: { this: { options: { install: true } } },
    exec: {
      eslint: 'node ./node_modules/eslint/bin/eslint.js --cache "backend/dashboard/**/*.{js,vue}"',
      puglint: '"./node_modules/.bin/pug-lint-vue" backend/dashboard/views',
      stylelint: 'node ./node_modules/stylelint/bin/stylelint.js --cache "backend/dashboard/assets/style/**/*.{css,sass,scss}" "backend/dashboard/views/**/*.vue"'
    },
    clean: { dist: [`${distDir}/*`] },
    copy: {
      indexHtml: {
        src: resolvePathFromRoot('index.html'),
        dest: `${distDir}/index.html`
      },
      assets: {
        cwd: resolvePathFromRoot('assets'),
        src: ['**/*', '!style/**'],
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
    'keepalive'
  ])

  grunt.registerTask('build', function () {
    grunt.task.run([
      'clean:dist',
      'exec:eslint',
      'exec:puglint',
      'exec:stylelint',
      'copy',
      this.flags.watch ? 'esbuild:watch' : 'esbuild'
    ])
  })

  grunt.registerTask('esbuild', async function () {
    const done = this.async()
    const { createEsbuildTask } = require('./scripts/esbuild-commands.js') 
    const aliasPlugin = require('./scripts/esbuild-plugins/alias-plugin.js')(aliasPluginOptions)
    const sassPlugin = require('esbuild-sass-plugin').sassPlugin(sassPluginOptions)
    const vuePlugin = require('./scripts/esbuild-plugins/vue-plugin.js')(vuePluginOptions)
    const buildMainJS = createEsbuildTask({
      ...esbuildOptionsBag.default,
      ...esbuildOptionsBag.mainJS,
      plugins: [aliasPlugin, sassPlugin, vuePlugin]
    })
    const buildMainCss = createEsbuildTask({
      ...esbuildOptionsBag.default,
      ...esbuildOptionsBag.mainCss,
      plugins: [sassPlugin]
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

    const browserSync = require('browser-sync').create('dashboard-test')
    browserSync.init(browserSyncOptions)
  })
}
