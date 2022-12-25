'use strict'

// ========================================
// A Gruntfile.js for chelonia-dashboard front-end
// ========================================

const path = require('path')

const dashboardRootDir = path.resolve(__dirname, 'backend/dashboard')
const pkgJSON = require('./package.json')

module.exports = (grunt) => {
  require('load-grunt-tasks')(grunt)

  grunt.initConfig({
    pkg: grunt.file.readJSON('./package.json'),
    checkDependencies: { this: { options: { install: true } } },
  })
  
  const randomStr = Math.random().toString(16).slice(2)
  grunt.registerTask('default', () => {
    console.log('randomStr generated: ', randomStr)
    console.log('project pkg name: ', grunt.config('pkg').name)
  })
}
