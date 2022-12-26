'use strict'

// ========================================
// A Gruntfile.js for chelonia-dashboard front-end
// ========================================

const path = require('path')
const { copyFile } = require('fs/promises')
const { NODE_ENV = 'development' } = process.env

// paths
const dashboardRootDir = path.resolve(__dirname, 'backend/dashboard')
const resolvePathFromRoot = relPath => path.join(dashboardRootDir, relPath)
const distDir = resolvePathFromRoot('dist')
const distAssets = path.join(distDir, 'assets')
const distCSS = path.join(distDir, 'assets/css')
const distJS = path.join(distDir, 'js')
const mainSrc = resolvePathFromRoot('main.js')

const isDevelopment = NODE_ENV === 'development'
const isProduction = !isDevelopment

module.exports = (grunt) => {
  require('load-grunt-tasks')(grunt)

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
      '@assets': './backend/dashboard/assets',
      '@components': './backend/dashboard/views/components',
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

  grunt.registerTask('dev-dashboard', [
    'checkDependencies',
    'build'
  ])

  grunt.registerTask('build', function () {
    grunt.task.run([
      'exec:eslint',
      'exec:puglint',
      'exec:stylelint',
      'clean:dist',
      'copy',
      this.flags.watch ? 'esbuild:watch' : 'esbuild'
    ])
  })

  grunt.registerTask('esbuild', async function () {
    const done = this.async()
    const { createEsbuildTask } = require('./scripts/esbuild-commands.js') 
    const sassPlugin = require('esbuild-sass-plugin').sassPlugin(sassPluginOptions)
    const vuePlugin = require('./scripts/esbuild-plugins/vue-plugin.js')(vuePluginOptions)
    const buildTask = createEsbuildTask(
      {
        ...esbuildOptions,
        plugins: [sassPlugin, vuePlugin]
      },
      {
        // Our `index.html` file is designed to load its CSS from `dist/assets/css`;
        // however, esbuild outputs `main.css` and `main.css.map` along `main.js`,
        // making a post-build copying operation necessary.
        postoperation: async ({ fileEventName, filePath } = {}) => {
          // Only after a fresh build or a rebuild caused by a CSS file event.
          if (!fileEventName || ['.css', '.sass', '.scss'].includes(path.extname(filePath))) {
            await copyFile(`${distJS}/main.css`, `${distCSS}/main.css`)
            if (isDevelopment) {
              await copyFile(`${distJS}/main.css.map`, `${distCSS}/main.css.map`)
            }
          }
        }
      }
    )

    try {
      await buildTask.run()
    } catch (err) {
      grunt.log.error(err.message)
      process.exit(1)
    }

    return done()
  })
}
