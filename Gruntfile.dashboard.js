'use strict'

// ========================================
// A Gruntfile.js for chelonia-dashboard front-end
// ========================================

const path = require('path')

const dashboardRootDir = path.resolve(__dirname, 'backend/dashboard')
const resolvePathFromRoot = relPath => path.join(dashboardRootDir, relPath)
const distDir = resolvePathFromRoot('dist')
const distAssetsDir = path.join(distDir, 'assets')
const pkgJSON = require('./package.json')

module.exports = (grunt) => {
  require('load-grunt-tasks')(grunt)

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
        dest: distAssetsDir,
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
      'copy'
    ])
  })
}
