/* A separate grunt file for chelonia dashboard */
const path = require('path')

const currentDir = __dirname
const projectRootDir = path.resolve(currentDir, '../../')

module.exports = (grunt) => {
  grunt.initConfig({
    pkg: grunt.file.readJSON(path.join(projectRootDir, 'package.json'))
  })
  
  const randomStr = Math.random().toString(16).slice(2)
  grunt.registerTask('default', () => {
    console.log('randomStr generated: ', randomStr)
  })
}
